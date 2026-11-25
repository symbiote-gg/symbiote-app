//! The bests the owner beat this session, career-wide and on a hero.
//!
//! Each session game is held against the games played before it only, so a session
//! game never counts against the bests of an earlier one.

use std::collections::HashMap;

use chrono::{DateTime, Utc};
use sqlx::FromRow;

use crate::standouts::CHEAP_DEATH_HEROES;
use crate::types::replay::Mode;
use crate::types::stats::{BestMetric, ScoreScope, SessionBest};

/// Fewer earlier games make every other game a best.
const MIN_GAMES: usize = 10;

/// Matches the shortest win streak the bests pages show.
const MIN_WIN_STREAK: i64 = 2;

/// The game metrics the profile's bests page shows. Win streaks are tracked apart.
const CAREER_METRICS: [BestMetric; 5] = [
    BestMetric::HeroDamage,
    BestMetric::SiegeDamage,
    BestMetric::Healing,
    BestMetric::FastestWin,
    BestMetric::Takedowns,
];

/// The game metrics a hero's bests page shows. Win streaks are tracked apart.
/// Fewest deaths comes last, so cheap-death heroes take the slice before it.
const HERO_METRICS: [BestMetric; 8] = [
    BestMetric::HeroDamage,
    BestMetric::SiegeDamage,
    BestMetric::Healing,
    BestMetric::DamageTaken,
    BestMetric::Xp,
    BestMetric::Takedowns,
    BestMetric::FastestWin,
    BestMetric::FewestDeathsWin,
];

/// One of the owner's games, with the figures their bests are picked by.
#[derive(Debug, Default, FromRow)]
pub struct BestGame {
    pub replay_id: i64,
    pub hero_id: i64,
    pub hero: String,
    pub hero_slug: String,
    pub healer: bool,
    pub mode: Option<Mode>,
    pub timestamp: DateTime<Utc>,
    pub duration: i64,
    pub win: Option<bool>,
    pub hero_damage: Option<i64>,
    pub siege_damage: Option<i64>,
    pub healing: Option<i64>,
    pub damage_taken: Option<i64>,
    pub xp: Option<i64>,
    pub takedowns: Option<i64>,
    pub deaths: Option<i64>,
}

/// Mirrors the `BestBy` rules of the bests pages: positive values only, the
/// fewest deaths zero included, the win metrics on wins only, and career healing
/// on healers only.
fn value(metric: BestMetric, game: &BestGame, career: bool) -> Option<f64> {
    let won = game.win == Some(true);
    let (value, zero) = match metric {
        BestMetric::HeroDamage => (game.hero_damage, false),
        BestMetric::SiegeDamage => (game.siege_damage, false),
        BestMetric::Healing if career && !game.healer => (None, false),
        BestMetric::Healing => (game.healing, false),
        BestMetric::DamageTaken => (game.damage_taken, false),
        BestMetric::Xp => (game.xp, false),
        BestMetric::Takedowns => (game.takedowns, false),
        BestMetric::FastestWin => (won.then_some(game.duration), false),
        BestMetric::FewestDeathsWin => (game.deaths.filter(|_| won), true),
        BestMetric::WinStreak => (None, false),
    };

    value
        .filter(|&value| if zero { value >= 0 } else { value > 0 })
        .map(|value| value as f64)
}

fn lowest(metric: BestMetric) -> bool {
    matches!(metric, BestMetric::FastestWin | BestMetric::FewestDeathsWin)
}

/// The bests over the games played so far, career-wide or on one hero.
#[derive(Default)]
struct Bests {
    games: usize,
    values: HashMap<BestMetric, f64>,
    run: i64,
    longest: i64,
}

impl Bests {
    /// Adds `game`, returning the bests it beat when `judge` is set.
    fn add(
        &mut self,
        game: &BestGame,
        metrics: &[BestMetric],
        career: bool,
        judge: bool,
    ) -> Vec<(BestMetric, f64, f64)> {
        let judge = judge && self.games >= MIN_GAMES;
        let mut beaten = Vec::new();

        for &metric in metrics {
            let Some(value) = value(metric, game, career) else {
                continue;
            };
            let previous = self.values.get(&metric).copied();

            let better = previous.is_none_or(|previous| {
                if lowest(metric) {
                    value < previous
                } else {
                    value > previous
                }
            });
            if !better {
                continue;
            }

            if let (true, Some(previous)) = (judge, previous) {
                beaten.push((metric, value, previous));
            }
            self.values.insert(metric, value);
        }

        // A game without a result neither breaks the run nor adds to it.
        match game.win {
            Some(true) => self.run += 1,
            Some(false) => self.run = 0,
            None => {}
        }
        if self.run > self.longest {
            if judge && self.longest >= MIN_WIN_STREAK {
                beaten.push((BestMetric::WinStreak, self.run as f64, self.longest as f64));
            }
            self.longest = self.run;
        }

        self.games += 1;
        beaten
    }
}

/// Returns the bests beaten by the games ended since `session_start`, newest first.
///
/// `games` must be in the order they were played. A best beaten more than once this
/// session shows once, with its latest value and the value it had before the session.
/// A hero's best beaten by a game that also beat the career best is left out.
pub fn compute(games: &[BestGame], session_start: DateTime<Utc>) -> Vec<SessionBest> {
    let start = session_start.timestamp();
    let career_modes = ScoreScope::All.modes();

    let mut career = Bests::default();
    let mut heroes: HashMap<i64, Bests> = HashMap::new();
    let mut found: Vec<SessionBest> = Vec::new();

    for game in games {
        let judge = game.timestamp.timestamp() + game.duration >= start;

        let career_beaten = if game.mode.is_some_and(|mode| career_modes.contains(&mode)) {
            career.add(game, &CAREER_METRICS, true, judge)
        } else {
            Vec::new()
        };

        let cheap_deaths = CHEAP_DEATH_HEROES.contains(&game.hero_slug.as_str());
        let hero_metrics = if cheap_deaths {
            &HERO_METRICS[..HERO_METRICS.len() - 1]
        } else {
            &HERO_METRICS[..]
        };
        let hero_beaten =
            heroes
                .entry(game.hero_id)
                .or_default()
                .add(game, hero_metrics, false, judge);

        let hero_beaten = hero_beaten
            .into_iter()
            .filter(|(metric, ..)| !career_beaten.iter().any(|(m, ..)| m == metric));

        let beaten = career_beaten
            .iter()
            .map(|&beat| (true, beat))
            .chain(hero_beaten.map(|beat| (false, beat)));

        for (is_career, (metric, value, previous)) in beaten {
            // A career best beat the hero's best this session too.
            if is_career {
                found.retain(|other| {
                    other.career || other.metric != metric || other.hero_id != game.hero_id
                });
            }

            let best = SessionBest {
                metric,
                career: is_career,
                hero_id: game.hero_id,
                hero: game.hero.clone(),
                value,
                previous,
                replay_id: game.replay_id,
                timestamp: game.timestamp,
            };

            let same = found.iter_mut().find(|other| {
                other.metric == metric
                    && other.career == is_career
                    && (is_career || other.hero_id == game.hero_id)
            });
            match same {
                Some(other) => {
                    *other = SessionBest {
                        previous: other.previous,
                        ..best
                    }
                }
                None => found.push(best),
            }
        }
    }

    // Stable, so a game's career bests stay ahead of its hero's.
    found.sort_by_key(|best| std::cmp::Reverse(best.timestamp));
    found
}

#[cfg(test)]
mod tests {
    use chrono::TimeZone;

    use super::*;

    const JAINA: i64 = 1;
    const VALLA: i64 = 2;

    fn at(secs: i64) -> DateTime<Utc> {
        Utc.timestamp_opt(secs, 0).unwrap()
    }

    /// A lost Quick Match on Jaina, the `index`th game, with `hero_damage`.
    fn game(index: i64, hero_damage: i64) -> BestGame {
        BestGame {
            replay_id: index,
            hero_id: JAINA,
            hero: "Jaina".to_owned(),
            hero_slug: "Jaina".to_owned(),
            mode: Some(Mode::QuickMatch),
            timestamp: at(index * 10_000),
            duration: 1200,
            win: Some(false),
            hero_damage: Some(hero_damage),
            ..Default::default()
        }
    }

    /// Ten games on Jaina dealing 50k each, then `session` after the session started.
    fn with_session(session: Vec<BestGame>) -> Vec<SessionBest> {
        let mut games: Vec<BestGame> = (0..10).map(|i| game(i, 50_000)).collect();
        let start = at(10 * 10_000);
        games.extend(session);
        compute(&games, start)
    }

    fn summary(bests: &[SessionBest]) -> Vec<(BestMetric, bool, f64, f64)> {
        bests
            .iter()
            .map(|best| (best.metric, best.career, best.value, best.previous))
            .collect()
    }

    #[test]
    fn flags_a_career_best_beaten_this_session() {
        let bests = with_session(vec![game(10, 60_000)]);
        assert_eq!(
            summary(&bests),
            [(BestMetric::HeroDamage, true, 60_000.0, 50_000.0)]
        );
        assert_eq!(bests[0].replay_id, 10);
    }

    #[test]
    fn a_tie_is_not_a_best() {
        assert!(with_session(vec![game(10, 50_000)]).is_empty());
    }

    #[test]
    fn games_before_the_session_are_not_flagged() {
        let mut games: Vec<BestGame> = (0..10).map(|i| game(i, 50_000)).collect();
        games.push(game(10, 60_000));
        assert!(compute(&games, at(20 * 10_000)).is_empty());
    }

    #[test]
    fn needs_enough_earlier_games() {
        let games = vec![game(0, 50_000), game(1, 60_000)];
        assert!(compute(&games, at(0)).is_empty());
    }

    #[test]
    fn a_hero_best_needs_enough_games_on_the_hero() {
        let mut valla = game(10, 10_000);
        valla.hero_id = VALLA;
        valla.hero_slug = "Valla".to_owned();
        let mut second = game(11, 20_000);
        second.hero_id = VALLA;
        second.hero_slug = "Valla".to_owned();

        assert!(with_session(vec![valla, second]).is_empty());
    }

    #[test]
    fn flags_a_hero_best_below_the_career_one() {
        let mut games: Vec<BestGame> = (0..10).map(|i| game(i, 50_000)).collect();
        games.push(game(10, 90_000));
        for i in 11..21 {
            let mut valla = game(i, 20_000);
            valla.hero_id = VALLA;
            valla.hero = "Valla".to_owned();
            valla.hero_slug = "Valla".to_owned();
            games.push(valla);
        }
        let mut best = game(21, 30_000);
        best.hero_id = VALLA;
        best.hero = "Valla".to_owned();
        best.hero_slug = "Valla".to_owned();
        games.push(best);

        let bests = compute(&games, at(21 * 10_000));
        assert_eq!(
            summary(&bests),
            [(BestMetric::HeroDamage, false, 30_000.0, 20_000.0)]
        );
        assert_eq!(bests[0].hero, "Valla");
    }

    #[test]
    fn a_career_best_hides_the_same_hero_best() {
        let bests = with_session(vec![game(10, 60_000)]);
        assert!(bests.iter().all(|best| best.career));
    }

    #[test]
    fn a_later_career_best_hides_an_earlier_hero_best() {
        let mut games: Vec<BestGame> = (0..10).map(|i| game(i, 50_000)).collect();
        for i in 10..20 {
            let mut valla = game(i, 80_000);
            valla.hero_id = VALLA;
            valla.hero = "Valla".to_owned();
            games.push(valla);
        }
        let mut aram = game(20, 60_000);
        aram.mode = Some(Mode::Aram);
        games.push(aram);
        games.push(game(21, 90_000));

        let bests = compute(&games, at(20 * 10_000));
        assert_eq!(
            summary(&bests),
            [(BestMetric::HeroDamage, true, 90_000.0, 80_000.0)]
        );
    }

    #[test]
    fn a_best_beaten_twice_keeps_the_value_before_the_session() {
        let bests = with_session(vec![game(10, 60_000), game(11, 70_000)]);
        assert_eq!(
            summary(&bests),
            [(BestMetric::HeroDamage, true, 70_000.0, 50_000.0)]
        );
        assert_eq!(bests[0].replay_id, 11);
    }

    #[test]
    fn healing_counts_career_wide_on_healers_only() {
        let mut games: Vec<BestGame> = (0..10)
            .map(|i| BestGame {
                healer: true,
                healing: Some(40_000),
                ..game(i, 0)
            })
            .collect();
        games.push(BestGame {
            healing: Some(80_000),
            ..game(10, 0)
        });

        let bests = compute(&games, at(10 * 10_000));
        assert_eq!(
            summary(&bests),
            [(BestMetric::Healing, false, 80_000.0, 40_000.0)]
        );
    }

    #[test]
    fn aram_counts_for_the_hero_only() {
        let mut aram = game(10, 60_000);
        aram.mode = Some(Mode::Aram);
        let bests = with_session(vec![aram]);
        assert_eq!(
            summary(&bests),
            [(BestMetric::HeroDamage, false, 60_000.0, 50_000.0)]
        );
    }

    #[test]
    fn flags_a_longer_win_streak() {
        let mut games: Vec<BestGame> = (0..10).map(|i| game(i, 50_000)).collect();
        games[1].win = Some(true);
        games[2].win = Some(true);
        let won = |index| BestGame {
            win: Some(true),
            duration: 1200,
            ..game(index, 1)
        };
        games.extend([won(10), won(11), won(12)]);

        let bests = compute(&games, at(10 * 10_000));
        let streaks: Vec<_> = summary(&bests)
            .into_iter()
            .filter(|best| best.0 == BestMetric::WinStreak)
            .collect();
        assert_eq!(streaks, [(BestMetric::WinStreak, true, 3.0, 2.0)]);
    }

    #[test]
    fn a_game_without_a_result_keeps_the_run() {
        let mut games: Vec<BestGame> = (0..10).map(|i| game(i, 50_000)).collect();
        games[1].win = Some(true);
        games[2].win = Some(true);
        let mut session = vec![game(10, 1), game(11, 1), game(12, 1)];
        session[0].win = Some(true);
        session[1].win = None;
        session[2].win = Some(true);
        games.extend(session);

        let bests = compute(&games, at(10 * 10_000));
        assert!(!bests
            .iter()
            .any(|best| best.metric == BestMetric::WinStreak));
    }

    #[test]
    fn fewest_deaths_skips_cheap_death_heroes() {
        let murky = |index, deaths| BestGame {
            hero_slug: "Murky".to_owned(),
            win: Some(true),
            deaths: Some(deaths),
            mode: Some(Mode::Aram),
            ..game(index, 0)
        };
        let mut games: Vec<BestGame> = (0..10).map(|i| murky(i, 5)).collect();
        games.push(murky(10, 0));

        let bests = compute(&games, at(10 * 10_000));
        assert!(!bests
            .iter()
            .any(|best| best.metric == BestMetric::FewestDeathsWin));
    }
}
