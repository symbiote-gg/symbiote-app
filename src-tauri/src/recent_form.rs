//! The owner's last weeks against the weeks before, each part of their game ranked
//! among their own games: 50 is their usual game.

use std::collections::HashMap;

use chrono::{DateTime, TimeDelta, Utc};

use crate::profile_score::{
    game_totals, hero_weight, lower_is_better, rank, rate, survival_weights, zero_share,
    PlayerGame, NOT_IN_KIT,
};
use crate::role_performances::Weights;
use crate::types::hero::HeroRole;
use crate::types::role_performances::RoleStat;
use crate::types::stats::{FormAxis, FormAxisRow, FormWindows, RecentForm, RoleForm};

const WINDOW_DAYS: i64 = 28;

const MIN_GAMES: usize = 5;

/// Under this many of the owner's games in a role there's no usual game to rank against.
const MIN_BASELINE_GAMES: usize = 10;

const AXES: [FormAxis; 6] = [
    FormAxis::HeroDamage,
    FormAxis::SiegeDamage,
    FormAxis::Xp,
    FormAxis::KillParticipation,
    FormAxis::Survival,
    FormAxis::Camps,
];

/// Every stat an axis reads, for any hero.
const STATS: [RoleStat; 7] = [
    RoleStat::HeroDamage,
    RoleStat::SiegeDamage,
    RoleStat::Xp,
    RoleStat::KillParticipation,
    RoleStat::DeathShare,
    RoleStat::TimeDeadShare,
    RoleStat::MercCaptures,
];

fn axis_weights(axis: FormAxis, slug: &str) -> Weights {
    match axis {
        FormAxis::HeroDamage => &[(RoleStat::HeroDamage, 1)],
        FormAxis::SiegeDamage => &[(RoleStat::SiegeDamage, 1)],
        FormAxis::Xp => &[(RoleStat::Xp, 1)],
        FormAxis::KillParticipation => &[(RoleStat::KillParticipation, 1)],
        FormAxis::Survival => survival_weights(slug),
        FormAxis::Camps => &[(RoleStat::MercCaptures, 1)],
    }
}

struct OwnerGame<'a> {
    player: &'a PlayerGame,
    role: HeroRole,
    ended: DateTime<Utc>,
    rates: Vec<(RoleStat, f64)>,
}

impl OwnerGame<'_> {
    fn rate(&self, stat: RoleStat) -> Option<f64> {
        self.rates
            .iter()
            .find(|&&(s, _)| s == stat)
            .map(|&(_, rate)| rate)
    }
}

/// The owner's own sorted rates, by hero and by role.
#[derive(Default)]
struct Baselines {
    heroes: HashMap<(i64, RoleStat), Vec<f64>>,
    roles: HashMap<(HeroRole, RoleStat), Vec<f64>>,
    role_games: HashMap<HeroRole, usize>,
}

impl Baselines {
    fn new(games: &[OwnerGame]) -> Self {
        let mut baselines = Self::default();
        for game in games {
            *baselines.role_games.entry(game.role).or_default() += 1;

            for &(stat, rate) in &game.rates {
                baselines
                    .heroes
                    .entry((game.player.hero_id, stat))
                    .or_default()
                    .push(rate);
                baselines
                    .roles
                    .entry((game.role, stat))
                    .or_default()
                    .push(rate);
            }
        }

        for rates in baselines
            .heroes
            .values_mut()
            .chain(baselines.roles.values_mut())
        {
            rates.sort_by(f64::total_cmp);
        }

        baselines
    }

    /// The share of the owner's own games the rate does better than, read against
    /// the hero's games more the more of them there are.
    fn percentile(&self, hero_id: i64, role: HeroRole, stat: RoleStat, rate: f64) -> Option<f64> {
        if self.role_games.get(&role).copied().unwrap_or(0) < MIN_BASELINE_GAMES {
            return None;
        }

        let role_rates = self.roles.get(&(role, stat))?;
        let hero_rates = self.heroes.get(&(hero_id, stat))?;
        let weight = hero_weight(hero_rates.len());

        let zeros = weight * zero_share(hero_rates) + (1.0 - weight) * zero_share(role_rates);
        if zeros > NOT_IN_KIT {
            return None;
        }

        let blended = weight * rank(hero_rates, rate) + (1.0 - weight) * rank(role_rates, rate);

        Some(if lower_is_better(stat) {
            1.0 - blended
        } else {
            blended
        })
    }
}

struct ScoredGame {
    role: HeroRole,
    ended: DateTime<Utc>,
    axes: [Option<f64>; AXES.len()],
}

/// A game the owner's role has too few games to rank still counts toward the window,
/// with every axis unrated.
fn score_game(game: &OwnerGame, baselines: &Baselines) -> ScoredGame {
    let axes = AXES.map(|axis| {
        let ranked: Vec<_> = axis_weights(axis, &game.player.hero_slug)
            .iter()
            .filter_map(|&(stat, weight)| {
                let percentile =
                    baselines.percentile(game.player.hero_id, game.role, stat, game.rate(stat)?)?;
                Some((f64::from(weight), percentile))
            })
            .collect();

        let total: f64 = ranked.iter().map(|&(weight, _)| weight).sum();
        (total > 0.0).then(|| ranked.iter().map(|&(w, p)| w * p).sum::<f64>() / total)
    });

    ScoredGame {
        role: game.role,
        ended: game.ended,
        axes,
    }
}

/// The games' count, and each axis's mean once enough of them rate it.
fn window(games: &[&ScoredGame]) -> (usize, [Option<u8>; AXES.len()]) {
    let axes = std::array::from_fn(|i| {
        let values: Vec<f64> = games.iter().filter_map(|game| game.axes[i]).collect();
        (values.len() >= MIN_GAMES)
            .then(|| (values.iter().sum::<f64>() / values.len() as f64 * 100.0).round() as u8)
    });

    (games.len(), axes)
}

fn windows<'a>(games: impl Iterator<Item = &'a ScoredGame>, now: DateTime<Utc>) -> FormWindows {
    let split = now - TimeDelta::days(WINDOW_DAYS);
    let start = split - TimeDelta::days(WINDOW_DAYS);

    let (recent, previous): (Vec<_>, Vec<_>) = games
        .filter(|game| game.ended > start && game.ended <= now)
        .partition(|game| game.ended > split);

    let (recent_games, recent) = window(&recent);
    let (previous_games, previous) = window(&previous);

    FormWindows {
        recent_games,
        previous_games,
        axes: AXES
            .iter()
            .zip(recent.into_iter().zip(previous))
            .map(|(&axis, (recent, previous))| FormAxisRow {
                axis,
                recent,
                previous,
            })
            .collect(),
    }
}

/// Ranks the owner's games in `players` among each other and averages the ones
/// ended in the four weeks up to `now`, and the four before them.
pub fn compute(players: &[PlayerGame], now: DateTime<Utc>) -> RecentForm {
    let owned: Vec<OwnerGame> = players
        .chunk_by(|a, b| a.game_id == b.game_id)
        .flat_map(|game| {
            let totals = game_totals(game);
            game.iter()
                .filter(|player| player.is_owner)
                .filter_map(move |player| {
                    Some(OwnerGame {
                        player,
                        role: player.hero_role?,
                        ended: player.timestamp + TimeDelta::seconds(player.duration),
                        rates: STATS
                            .iter()
                            .filter_map(|&stat| Some((stat, rate(player, stat, &totals)?)))
                            .collect(),
                    })
                })
        })
        .collect();

    let baselines = Baselines::new(&owned);
    let scored: Vec<_> = owned
        .iter()
        .map(|game| score_game(game, &baselines))
        .collect();

    let roles = HeroRole::ALL
        .into_iter()
        .map(|role| RoleForm {
            role,
            form: windows(scored.iter().filter(|game| game.role == role), now),
        })
        .filter(|role| role.form.axes.iter().any(|row| row.recent.is_some()))
        .collect();

    RecentForm {
        all: windows(scored.iter(), now),
        roles,
        min_games: MIN_GAMES,
        min_baseline_games: MIN_BASELINE_GAMES,
        window_days: WINDOW_DAYS,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const JAINA: i64 = 1;
    const MURADIN: i64 = 2;

    const DAY: i64 = 24 * 60 * 60;

    fn now() -> DateTime<Utc> {
        DateTime::from_timestamp(1_000 * DAY, 0).unwrap()
    }

    /// The owner on `hero_id` in a ten minute game ending `days_ago`, with an
    /// enemy giving them kills to take part in.
    fn game(game_id: i64, days_ago: i64, hero_id: i64, hero_damage: i64) -> Vec<PlayerGame> {
        let (slug, role) = if hero_id == JAINA {
            ("Jaina", HeroRole::RangedAssassin)
        } else {
            ("Muradin", HeroRole::Tank)
        };
        let ended = now() - TimeDelta::days(days_ago);

        let player = |team, is_owner| PlayerGame {
            game_id,
            timestamp: ended - TimeDelta::seconds(600),
            duration: 600,
            team,
            hero_id,
            hero_slug: slug.to_owned(),
            hero_role: Some(role),
            takedowns: Some(5),
            deaths: Some(2),
            hero_damage: Some(hero_damage),
            siege_damage: Some(10_000),
            xp: Some(10_000),
            time_dead_secs: Some(60.0),
            merc_captures: Some(1),
            is_owner,
            ..Default::default()
        };

        vec![player(0, true), player(1, false)]
    }

    fn axis(form: &FormWindows, axis: FormAxis) -> &FormAxisRow {
        form.axes.iter().find(|row| row.axis == axis).unwrap()
    }

    #[test]
    fn a_usual_game_sits_at_fifty() {
        let players: Vec<_> = (1..=20)
            .flat_map(|id| game(id, id * 2, JAINA, 30_000))
            .collect();

        let form = compute(&players, now());
        let hero_damage = axis(&form.all, FormAxis::HeroDamage);
        assert_eq!(hero_damage.recent, Some(50));
        assert_eq!(hero_damage.previous, Some(50));
        assert_eq!(form.all.recent_games, 13);
    }

    #[test]
    fn the_best_recent_games_score_high_and_the_worst_low() {
        // Days ago 1..=10 are the career's top damage, 31..=40 its lowest.
        let players: Vec<_> = (1..=10)
            .flat_map(|id| game(id, id, JAINA, 50_000 + id))
            .chain((31..=40).flat_map(|id| game(id, id, JAINA, 10_000 + id)))
            .chain((61..=80).flat_map(|id| game(id, id, JAINA, 30_000 + id)))
            .collect();

        let form = compute(&players, now());
        let hero_damage = axis(&form.all, FormAxis::HeroDamage);
        assert!(hero_damage.recent.unwrap() > 80);
        assert!(hero_damage.previous.unwrap() < 20);
    }

    #[test]
    fn fewer_deaths_score_higher() {
        let mut players: Vec<_> = (1..=20)
            .flat_map(|id| game(id, id + 30, JAINA, 30_000))
            .collect();
        for id in 21..=25 {
            let mut recent = game(id, 1, JAINA, 30_000);
            recent[0].deaths = Some(0);
            recent[0].time_dead_secs = Some(0.0);
            players.extend(recent);
        }

        let form = compute(&players, now());
        let survival = axis(&form.all, FormAxis::Survival);
        assert!(survival.recent.unwrap() > 80);
    }

    #[test]
    fn roles_rank_among_their_own_games() {
        // A tank's damage is far under the assassin's, yet usual for a tank.
        let players: Vec<_> = (1..=12)
            .flat_map(|id| game(id, id, JAINA, 60_000))
            .chain((13..=24).flat_map(|id| game(id, id - 12, MURADIN, 15_000)))
            .collect();

        let form = compute(&players, now());
        assert_eq!(axis(&form.all, FormAxis::HeroDamage).recent, Some(50));

        let roles: Vec<_> = form.roles.iter().map(|role| role.role).collect();
        assert_eq!(roles, [HeroRole::Tank, HeroRole::RangedAssassin]);
        assert_eq!(form.roles[0].form.recent_games, 12);
    }

    #[test]
    fn windows_split_at_four_weeks() {
        let players: Vec<_> = [0, 27, 28, 29, 55, 56, 57]
            .into_iter()
            .zip(1..)
            .flat_map(|(days_ago, id)| game(id, days_ago, JAINA, 30_000))
            .chain((100..=110).flat_map(|id| game(id, id, JAINA, 30_000)))
            .collect();

        let form = compute(&players, now());
        assert_eq!(form.all.recent_games, 2);
        assert_eq!(form.all.previous_games, 3);
    }

    #[test]
    fn too_few_games_leave_the_window_unrated() {
        let players: Vec<_> = (1..=20)
            .flat_map(|id| game(id, id, JAINA, 30_000))
            .chain((40..=43).flat_map(|id| game(id, id, JAINA, 30_000)))
            .collect();

        let form = compute(&players, now());
        assert_eq!(form.all.previous_games, 4);
        assert!(form.all.axes.iter().all(|row| row.previous.is_none()));
        assert!(form.all.axes.iter().all(|row| row.recent.is_some()));
    }

    #[test]
    fn an_axis_few_games_rate_goes_unrated() {
        let mut players: Vec<_> = (1..=20)
            .flat_map(|id| game(id, id, JAINA, 30_000))
            .collect();
        for player in &mut players {
            if player.game_id > 2 {
                player.merc_captures = None;
            }
        }

        let form = compute(&players, now());
        assert_eq!(form.all.recent_games, 20);
        assert_eq!(axis(&form.all, FormAxis::Camps).recent, None);
        assert!(axis(&form.all, FormAxis::HeroDamage).recent.is_some());
    }

    #[test]
    fn games_in_a_role_without_a_usual_game_still_count() {
        let players: Vec<_> = (1..=20)
            .flat_map(|id| game(id, id + 30, JAINA, 30_000))
            .chain((21..=28).flat_map(|id| game(id, id - 20, MURADIN, 15_000)))
            .collect();

        let form = compute(&players, now());
        assert_eq!(form.all.recent_games, 8);
        assert!(form.all.axes.iter().all(|row| row.recent.is_none()));
        assert!(form.roles.is_empty());
    }

    #[test]
    fn camps_no_game_takes_go_unrated() {
        let mut players: Vec<_> = (1..=20)
            .flat_map(|id| game(id, id, JAINA, 30_000))
            .collect();
        for player in &mut players {
            player.merc_captures = Some(0);
        }

        let form = compute(&players, now());
        assert_eq!(axis(&form.all, FormAxis::Camps).recent, None);
    }
}
