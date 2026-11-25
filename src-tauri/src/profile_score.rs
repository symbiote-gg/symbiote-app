//! The owner's latest games scored against other players: each stat a hero is
//! weighted on ranked among the same hero's players, and among its role's when few
//! played the hero, then averaged into points that sum to a score out of 100.

use std::borrow::Borrow;
use std::collections::HashMap;

use chrono::{DateTime, TimeDelta, Utc};

use crate::rating::baseline::Baseline;
use crate::rating::heroes::{LOST_VIKINGS, PUSHERS};
use crate::rating::{
    game_totals, points, rate, round_to_total, GameTotals, PlayerGame, Weights, STAT_COUNT,
};
use crate::types::hero::HeroRole;
use crate::types::role_performances::RoleStat::{
    self, DeathShare, HardCc, Healing, HeroDamage, KillParticipation, MercCaptures, Protection,
    SiegeDamage, TeamfightDamageTakenShare, TeamfightHeroDamageShare, TimeDeadShare, Xp,
};
use crate::types::stats::{
    GameScore, HeroScoreRow, PillarMax, ProfileScore, ScorePillar, ScorePillarId, ScorePoint,
    ScoreStat, ScoredHero,
};

const WINDOW: usize = 50;

const MIN_GAMES: usize = 10;

const PILLARS: [(ScorePillarId, &[RoleStat]); 4] = [
    (
        ScorePillarId::Fighting,
        &[HeroDamage, KillParticipation, HardCc],
    ),
    (ScorePillarId::Survival, &[DeathShare, TimeDeadShare]),
    (
        ScorePillarId::TeamRole,
        &[
            Healing,
            Protection,
            TeamfightDamageTakenShare,
            TeamfightHeroDamageShare,
        ],
    ),
    (ScorePillarId::Map, &[Xp, SiegeDamage, MercCaptures]),
];

/// Each pillar's share of a game, in [`PILLARS`] order. Survival is kept small so
/// staying alive doesn't outscore doing anything while alive.
const PILLAR_SHARES: [f64; 4] = [0.30, 0.15, 0.30, 0.25];

/// Each pillar's stats weighed against each other, in [`PILLARS`] order. A pillar's
/// worth is fixed by [`PILLAR_SHARES`], so a role's key stats only lean within
/// theirs. Kept apart from the replay's role weights, which score fewer stats.
fn pillar_weights(slug: &str, role: HeroRole) -> [Weights; 4] {
    let fighting: Weights = match role {
        HeroRole::RangedAssassin | HeroRole::MeleeAssassin => {
            &[(HeroDamage, 3), (KillParticipation, 2), (HardCc, 1)]
        }
        HeroRole::Tank => &[(HeroDamage, 1), (KillParticipation, 2), (HardCc, 2)],
        _ => &[(HeroDamage, 2), (KillParticipation, 2), (HardCc, 1)],
    };

    let team_role: Weights = match slug {
        "Abathur" => &[(Protection, 2), (Healing, 1)],
        "Medivh" | "Zarya" => &[(Protection, 3), (Healing, 1)],
        _ => match role {
            // Bruisers too: their damage taken outside fights is mostly the solo
            // lane, not soaking for the team.
            HeroRole::Tank | HeroRole::Bruiser => {
                &[(TeamfightDamageTakenShare, 3), (Protection, 1)]
            }
            HeroRole::Healer => &[(Healing, 3), (Protection, 1)],
            HeroRole::RangedAssassin | HeroRole::MeleeAssassin => {
                &[(TeamfightHeroDamageShare, 3), (Protection, 1)]
            }
            HeroRole::Support => &[(Protection, 1), (Healing, 1)],
        },
    };

    let map: Weights = match slug {
        // Most Abathur games take no camp, so captures would go unscored anyway.
        "Abathur" => &[(Xp, 3), (SiegeDamage, 2)],
        _ if PUSHERS.contains(&slug) => &[(Xp, 1), (SiegeDamage, 3), (MercCaptures, 1)],
        _ if role == HeroRole::RangedAssassin => &[(Xp, 2), (SiegeDamage, 2), (MercCaptures, 1)],
        _ => &[(Xp, 2), (SiegeDamage, 1), (MercCaptures, 1)],
    };

    [fighting, survival_weights(slug), team_role, map]
}

pub(crate) fn survival_weights(slug: &str) -> Weights {
    match slug {
        // Time dead adds up all three Vikings' timers, while scoreboard deaths
        // only count full wipes.
        LOST_VIKINGS => &[(DeathShare, 1)],
        _ => &[(DeathShare, 2), (TimeDeadShare, 1)],
    }
}

/// One of the owner's games: its score from 0 to 1 and each stat's weight in it
/// with the percentile reached.
struct ScoredGame {
    game_id: i64,
    timestamp: DateTime<Utc>,
    ended: DateTime<Utc>,
    hero_id: i64,
    score: f64,
    /// The share of the game's ranking done against the hero's players.
    hero_weight: f64,
    /// (stat, share of the game's weights, percentile)
    parts: Vec<(RoleStat, f64, f64)>,
}

fn score_game(
    player: &PlayerGame,
    role: HeroRole,
    totals: &GameTotals,
    baseline: &Baseline,
) -> Option<ScoredGame> {
    let ranked: Vec<(f64, Vec<_>)> = pillar_weights(&player.hero_slug, role)
        .iter()
        .zip(PILLAR_SHARES)
        .map(|(weights, share)| {
            let stats = weights
                .iter()
                .filter_map(|&(stat, weight)| {
                    let rate = rate(player, stat, totals)?;
                    let percentile = baseline.percentile(player.hero_id, role, stat, rate)?;
                    Some((stat, f64::from(weight), percentile))
                })
                .collect();
            (share, stats)
        })
        .filter(|(_, stats): &(f64, Vec<_>)| !stats.is_empty())
        .collect();

    if ranked.is_empty() {
        return None;
    }

    // The pillars left keep their shares scaled up to the whole game, each split
    // among its stats by weight.
    let total_share: f64 = ranked.iter().map(|&(share, _)| share).sum();
    let parts: Vec<_> = ranked
        .into_iter()
        .flat_map(|(share, stats)| {
            let pillar_share = share / total_share;
            let total_weight: f64 = stats.iter().map(|&(_, weight, _)| weight).sum();
            stats.into_iter().map(move |(stat, weight, percentile)| {
                (stat, pillar_share * weight / total_weight, percentile)
            })
        })
        .collect();
    let score = parts.iter().map(|&(_, weight, p)| weight * p).sum();
    let hero_weight = parts
        .iter()
        .map(|&(stat, weight, _)| weight * baseline.hero_blend(player.hero_id, stat))
        .sum();

    Some(ScoredGame {
        game_id: player.game_id,
        timestamp: player.timestamp,
        ended: player.timestamp + TimeDelta::seconds(player.duration),
        hero_id: player.hero_id,
        score,
        hero_weight,
        parts,
    })
}

/// Takes points back from stats rounded over their max, giving them to the stats
/// with room that were rounded down the most.
fn cap_points(points: &mut [u8], maxes: &[u8], raw: &[f64]) {
    while let Some(over) = (0..points.len()).find(|&i| points[i] > maxes[i]) {
        let room = (0..points.len())
            .filter(|&i| points[i] < maxes[i])
            .max_by(|&a, &b| {
                (raw[a] - f64::from(points[a])).total_cmp(&(raw[b] - f64::from(points[b])))
            });
        let Some(room) = room else {
            break;
        };

        points[over] -= 1;
        points[room] += 1;
    }
}

fn pillars(games: &[&ScoredGame], score: u8) -> Vec<ScorePillar> {
    let count = games.len() as f64;

    // Per stat: summed points, summed max, summed percentile, games it counted in.
    let mut sums = [(0.0, 0.0, 0.0, 0usize); STAT_COUNT];
    for game in games {
        for &(stat, weight, percentile) in &game.parts {
            let sum = &mut sums[stat as usize];
            sum.0 += weight * percentile * 100.0;
            sum.1 += weight * 100.0;
            sum.2 += percentile;
            sum.3 += 1;
        }
    }

    let raw_points: Vec<f64> = sums.iter().map(|sum| sum.0 / count).collect();
    let raw_maxes: Vec<f64> = sums.iter().map(|sum| sum.1 / count).collect();
    let maxes = round_to_total(&raw_maxes, 100);
    let mut points = round_to_total(&raw_points, score);
    cap_points(&mut points, &maxes, &raw_points);

    PILLARS
        .into_iter()
        .filter_map(|(id, stats)| {
            let stats: Vec<_> = stats
                .iter()
                // A stat too rare in the games to be worth a point is left out.
                .filter(|&&stat| maxes[stat as usize] > 0)
                .map(|&stat| {
                    let (_, _, percentiles, counted) = sums[stat as usize];
                    ScoreStat {
                        stat,
                        percentile: percentiles / counted as f64,
                        points: points[stat as usize],
                        max: maxes[stat as usize],
                    }
                })
                .collect();

            if stats.is_empty() {
                return None;
            }

            let raw =
                |values: &[f64]| -> f64 { stats.iter().map(|s| values[s.stat as usize]).sum() };
            let percentile = raw(&raw_points) / raw(&raw_maxes);

            Some(ScorePillar {
                id,
                points: stats.iter().map(|s| s.points).sum(),
                max: stats.iter().map(|s| s.max).sum(),
                percentile,
                stats,
            })
        })
        .collect()
}

fn hero_rows(
    games: &[ScoredGame],
    heroes: Vec<ScoredHero>,
    baseline: &Baseline,
    session_start: DateTime<Utc>,
) -> Vec<HeroScoreRow> {
    let mut by_hero: HashMap<i64, Vec<&ScoredGame>> = HashMap::new();
    for game in games {
        by_hero.entry(game.hero_id).or_default().push(game);
    }

    let mut rows: Vec<_> = heroes
        .into_iter()
        .filter_map(|hero| {
            let hero_games = by_hero.get(&hero.id)?;

            let count = hero_games.len() as f64;
            let score = points(hero_games.iter().map(|game| game.score).sum::<f64>() / count);
            let weight = hero_games.iter().map(|game| game.hero_weight).sum::<f64>() / count;

            Some(HeroScoreRow {
                hero_id: hero.id,
                name: hero.name,
                role: hero.role,
                portrait: hero.portrait,
                games: hero_games.len(),
                score,
                hero_samples: baseline.hero_games(hero.id),
                hero_weight: weight,
                session_change: session_change(hero_games, session_start, 1),
                pillars: pillars(hero_games, score),
                history: history(hero_games),
            })
        })
        .collect();
    rows.sort_by(|a, b| b.games.cmp(&a.games).then_with(|| a.name.cmp(&b.name)));

    rows
}

/// Scores the owner's games against the other players in `players`: the career
/// broken down into its parts and heroes, and the latest games' score beside it.
/// Games ended since `session_start` are the session's.
pub fn compute(
    players: &[PlayerGame],
    heroes: Vec<ScoredHero>,
    session_start: DateTime<Utc>,
) -> ProfileScore {
    let games: Vec<_> = players.chunk_by(|a, b| a.game_id == b.game_id).collect();

    let totals: Vec<_> = games.iter().map(|&game| game_totals(game)).collect();

    let stats: Vec<RoleStat> = PILLARS
        .iter()
        .flat_map(|(_, stats)| stats.iter().copied())
        .collect();
    let baseline = Baseline::peers(games.iter().copied().zip(&totals), &stats);

    let scored: Vec<_> = games
        .iter()
        .zip(&totals)
        .flat_map(|(game, totals)| {
            let baseline = &baseline;
            game.iter()
                .filter(|p| p.is_owner)
                .filter_map(move |owner| score_game(owner, owner.hero_role?, totals, baseline))
        })
        .collect();

    let latest = &scored[scored.len().saturating_sub(WINDOW)..];
    let career = mean_points(&scored);
    let career_games: Vec<_> = scored.iter().collect();

    let eligible_games = players
        .iter()
        .filter(|p| p.is_owner && p.hero_role.is_some())
        .count();

    ProfileScore {
        score: mean_points(latest),
        margin: margin(latest),
        games: latest.len(),
        career,
        career_margin: margin(&scored),
        career_games: scored.len(),
        session_change: session_change(&career_games, session_start, MIN_GAMES),
        session_games: scored
            .iter()
            .filter(|game| game.ended >= session_start)
            .map(|game| GameScore {
                game_id: game.game_id,
                score: points(game.score),
            })
            .collect(),
        eligible_games,
        baseline_players: baseline.players(),
        min_games: MIN_GAMES,
        window: WINDOW,
        pillars: career.map_or_else(Vec::new, |career| pillars(&career_games, career)),
        pillar_maxes: PILLARS
            .iter()
            .zip(PILLAR_SHARES)
            .map(|(&(id, _), share)| PillarMax {
                id,
                max: (share * 100.0).round() as u8,
            })
            .collect(),
        heroes: if career.is_some() {
            hero_rows(&scored, heroes, &baseline, session_start)
        } else {
            Vec::new()
        },
        history: history(&scored),
    }
}

fn mean_score<G: Borrow<ScoredGame>>(games: &[G]) -> f64 {
    games.iter().map(|game| game.borrow().score).sum::<f64>() / games.len() as f64
}

/// The points the games ended since `session_start` moved the games' score by.
/// `None` without any of them, or with fewer than `min_games` before them. Both
/// scores rank against the same players, so only the session's games move it.
fn session_change(
    games: &[&ScoredGame],
    session_start: DateTime<Utc>,
    min_games: usize,
) -> Option<f64> {
    let before: Vec<f64> = games
        .iter()
        .filter(|game| game.ended < session_start)
        .map(|game| game.score)
        .collect();

    if before.len() == games.len() || before.len() < min_games {
        return None;
    }

    let now = games.iter().map(|game| game.score).sum::<f64>() / games.len() as f64;
    let earlier = before.iter().sum::<f64>() / before.len() as f64;

    // In points, to a tenth: finer than the score's own whole points, as a session
    // seldom moves a long career by a whole one.
    Some(((now - earlier) * 1000.0).round() / 10.0)
}

/// The games' mean score, once there are enough of them to rate.
fn mean_points<G: Borrow<ScoredGame>>(games: &[G]) -> Option<u8> {
    (games.len() >= MIN_GAMES).then(|| points(mean_score(games)))
}

// Of a normal distribution, the share within this many standard errors is 95%.
const MARGIN_ERRORS: f64 = 1.96;

/// How far the games' mean score could sit from where it is through the swings
/// between games alone, in points. Rounded up, so only games scoring all the same
/// give no margin.
fn margin(games: &[ScoredGame]) -> Option<u8> {
    (games.len() >= MIN_GAMES).then(|| {
        let count = games.len() as f64;
        let mean = games.iter().map(|game| game.score).sum::<f64>() / count;

        let squares: f64 = games.iter().map(|game| (game.score - mean).powi(2)).sum();
        let deviation = (squares / (count - 1.0)).sqrt();

        (MARGIN_ERRORS * deviation / count.sqrt() * 100.0).ceil() as u8
    })
}

/// The score as it stood after each game, over the window ending on it.
fn history<G: Borrow<ScoredGame>>(games: &[G]) -> Vec<ScorePoint> {
    (MIN_GAMES..=games.len())
        .filter_map(|end| {
            let latest = &games[end.saturating_sub(WINDOW)..end];
            Some(ScorePoint {
                timestamp: latest.last()?.borrow().timestamp,
                score: mean_points(latest)?,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rating::baseline::hero_weight;

    const JAINA: i64 = 1;
    const VALLA: i64 = 2;

    const NO_SESSION: DateTime<Utc> = DateTime::<Utc>::MAX_UTC;

    /// A ranged assassin in a ten minute game, so damage per minute is a tenth of it.
    fn assassin(game_id: i64, team: i64, hero_id: i64, hero_damage: i64) -> PlayerGame {
        PlayerGame {
            game_id,
            duration: 600,
            team,
            hero_id,
            hero_slug: if hero_id == JAINA { "Jaina" } else { "Valla" }.to_owned(),
            hero_role: Some(HeroRole::RangedAssassin),
            takedowns: Some(5),
            deaths: Some(2),
            hero_damage: Some(hero_damage),
            siege_damage: Some(10_000),
            ..Default::default()
        }
    }

    fn owner(game_id: i64, hero_damage: i64) -> PlayerGame {
        PlayerGame {
            is_owner: true,
            ..assassin(game_id, 0, JAINA, hero_damage)
        }
    }

    /// The owner with two players on each team, their damage spread around 30k.
    fn game(game_id: i64, owner_damage: i64) -> Vec<PlayerGame> {
        let other = |team, step: i64| assassin(game_id, team, VALLA, 30_000 + step * 1_000);
        vec![
            owner(game_id, owner_damage),
            other(0, game_id % 7),
            other(0, -(game_id % 5)),
            other(1, game_id % 3),
            other(1, -(game_id % 4)),
        ]
    }

    fn games(count: i64, owner_damage: impl Fn(i64) -> i64) -> Vec<PlayerGame> {
        (1..=count)
            .flat_map(|id| game(id, owner_damage(id)))
            .collect()
    }

    fn heroes() -> Vec<ScoredHero> {
        [(JAINA, "Jaina"), (VALLA, "Valla")]
            .into_iter()
            .map(|(id, name)| ScoredHero {
                id,
                name: name.to_owned(),
                role: Some(HeroRole::RangedAssassin),
                portrait: None,
            })
            .collect()
    }

    fn stat(score: &ProfileScore, stat: RoleStat) -> &ScoreStat {
        let mut stats = score.pillars.iter().flat_map(|pillar| &pillar.stats);
        stats.find(|s| s.stat == stat).unwrap()
    }

    #[test]
    fn baselines_leave_out_the_owner_and_ai() {
        let mut players = games(12, |_| 90_000);
        for game in players.chunks_mut(5) {
            game[1].is_ai = true;
            game[1].hero_damage = Some(500_000);
        }

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!(stat(&score, HeroDamage).percentile, 1.0);
        assert_eq!(score.baseline_players, 12 * 3);
    }

    #[test]
    fn fewer_deaths_rank_higher() {
        let mut players = games(12, |_| 30_000);
        for game in players.chunks_mut(5) {
            game[0].deaths = Some(0);
        }

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!(stat(&score, DeathShare).percentile, 1.0);
    }

    #[test]
    fn points_sum_to_the_score() {
        let players = games(23, |id| 24_000 + id * 700);

        let score = compute(&players, heroes(), NO_SESSION);
        let total: u8 = score.pillars.iter().map(|p| p.points).sum();
        assert_eq!(Some(total), score.score);
        assert_eq!(score.pillars.iter().map(|p| p.max).sum::<u8>(), 100);

        for pillar in &score.pillars {
            assert_eq!(
                pillar.points,
                pillar.stats.iter().map(|s| s.points).sum::<u8>()
            );
            assert!(pillar.stats.iter().all(|s| s.points <= s.max));

            let ahead = pillar.stats.iter().map(|s| s.percentile);
            let (least, most) = (ahead.clone().fold(1.0, f64::min), ahead.fold(0.0, f64::max));
            assert!((least - 1e-9..=most + 1e-9).contains(&pillar.percentile));
        }

        // No team role stats, so Fighting 30, Survival 15 and Map 25 scale up to
        // 100: hero damage 3 and kill participation 2 in Fighting, death share
        // alone in Survival, siege in Map.
        assert_eq!(stat(&score, HeroDamage).max, 26);
        assert_eq!(stat(&score, KillParticipation).max, 17);
        assert_eq!(stat(&score, DeathShare).max, 21);
    }

    #[test]
    fn hero_points_sum_to_the_hero_score() {
        let mut players = games(23, |id| 24_000 + id * 700);
        for player in players
            .iter_mut()
            .filter(|p| p.is_owner && p.game_id % 3 == 0)
        {
            player.hero_id = VALLA;
            player.hero_slug = "Valla".to_owned();
        }

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!(score.heroes.len(), 2);

        for hero in &score.heroes {
            assert_eq!(
                hero.pillars.iter().map(|p| p.points).sum::<u8>(),
                hero.score
            );
            assert_eq!(hero.pillars.iter().map(|p| p.max).sum::<u8>(), 100);
        }
    }

    #[test]
    fn pillars_weigh_their_share() {
        let mut players = games(12, |_| 30_000);
        for player in &mut players {
            player.time_dead_secs = Some(60.0);
            player.merc_captures = Some(2);
            player.protection = Some(1_000);
        }

        let score = compute(&players, heroes(), NO_SESSION);
        let maxes: Vec<_> = score.pillars.iter().map(|p| p.max).collect();
        assert_eq!(maxes, [30, 15, 30, 25]);
        assert_eq!(stat(&score, DeathShare).max, 10);
        assert_eq!(stat(&score, TimeDeadShare).max, 5);
    }

    #[test]
    fn lost_vikings_survive_on_deaths_alone() {
        let [_, survival, ..] = pillar_weights("LostVikings", HeroRole::Support);
        assert_eq!(survival, &[(DeathShare, 1)]);
    }

    #[test]
    fn less_time_dead_ranks_higher() {
        let mut players = games(12, |_| 30_000);
        for player in &mut players {
            player.time_dead_secs = Some(if player.is_owner { 0.0 } else { 90.0 });
        }

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!(stat(&score, TimeDeadShare).percentile, 1.0);
    }

    #[test]
    fn teamfight_damage_is_read_against_the_team() {
        // The owner does the same teamfight damage as both enemies, but carries a
        // team that barely did any.
        let mut players = games(12, |_| 30_000);
        for game in players.chunks_mut(5) {
            for (index, player) in game.iter_mut().enumerate() {
                player.teamfight_hero_damage = Some(if index == 0 || index > 2 {
                    10_000
                } else {
                    1_000
                });
            }
        }

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!(stat(&score, TeamfightHeroDamageShare).percentile, 1.0);
    }

    #[test]
    fn rounding_keeps_points_under_their_max() {
        let mut points = [4, 3];
        cap_points(&mut points, &[3, 6], &[3.6, 3.4]);
        assert_eq!(points, [3, 4]);
    }

    #[test]
    fn the_margin_follows_the_swings_between_games() {
        let scored = |scores: &[f64]| -> Vec<ScoredGame> {
            scores
                .iter()
                .map(|&score| ScoredGame {
                    game_id: 0,
                    timestamp: DateTime::UNIX_EPOCH,
                    ended: DateTime::UNIX_EPOCH,
                    hero_id: JAINA,
                    score,
                    hero_weight: 0.0,
                    parts: Vec::new(),
                })
                .collect()
        };

        assert_eq!(margin(&scored(&[0.5; MIN_GAMES - 1])), None);
        assert_eq!(margin(&scored(&[0.5; MIN_GAMES])), Some(0));

        // Half the games at 40 and half at 60: a deviation of 10.05 points over
        // 100 games, so 1.96 * 10.05 / 10 = 1.97.
        let swinging: Vec<_> = (0..100)
            .map(|i| if i % 2 == 0 { 0.4 } else { 0.6 })
            .collect();
        assert_eq!(margin(&scored(&swinging)), Some(2));
    }

    #[test]
    fn the_session_change_is_what_its_games_moved() {
        let start = DateTime::from_timestamp(5_000, 0).unwrap();
        let mut players = games(MIN_GAMES as i64 + 2, |id| {
            if id > MIN_GAMES as i64 {
                90_000
            } else {
                10_000
            }
        });
        for player in players.iter_mut().filter(|p| p.game_id > MIN_GAMES as i64) {
            player.timestamp = DateTime::from_timestamp(10_000, 0).unwrap();
        }

        let score = compute(&players, heroes(), start);
        let change = score.session_change.unwrap();
        assert!(change > 0.0);
        assert_eq!(change, (change * 10.0).round() / 10.0);
        assert_eq!(score.heroes[0].session_change, score.session_change);

        let session: Vec<_> = score.session_games.iter().map(|g| g.game_id).collect();
        assert_eq!(session, [MIN_GAMES as i64 + 1, MIN_GAMES as i64 + 2]);

        let none = compute(&players, heroes(), NO_SESSION);
        assert_eq!(none.session_change, None);
        assert!(none.session_games.is_empty());
        assert_eq!(none.heroes[0].session_change, None);

        // Every game is the session's: nothing before them to move from.
        let all = compute(&players, heroes(), DateTime::UNIX_EPOCH);
        assert_eq!(all.session_change, None);
        assert_eq!(all.heroes[0].session_change, None);
    }

    #[test]
    fn too_few_games_go_unrated() {
        let score = compute(
            &games(MIN_GAMES as i64 - 1, |_| 30_000),
            heroes(),
            NO_SESSION,
        );
        assert_eq!(score.score, None);
        assert_eq!((score.games, score.career), (MIN_GAMES - 1, None));
        assert_eq!((score.margin, score.career_margin), (None, None));
        assert!(score.pillars.is_empty() && score.heroes.is_empty() && score.history.is_empty());
    }

    #[test]
    fn games_short_of_players_to_rank_against_stay_eligible() {
        // One other player a game: too few in the role to rank the owner.
        let players: Vec<_> = games(MIN_GAMES as i64 + 2, |_| 30_000)
            .chunks(5)
            .flat_map(|game| game[..2].to_vec())
            .collect();

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!(
            (score.eligible_games, score.career_games),
            (MIN_GAMES + 2, 0)
        );
        assert_eq!(score.career, None);
    }

    #[test]
    fn the_career_breaks_down_and_the_window_trails() {
        // The owner out-damaged everyone in the first ten games, no one since.
        let players = games(
            WINDOW as i64 + 10,
            |id| if id <= 10 { 90_000 } else { 1_000 },
        );

        let score = compute(&players, heroes(), NO_SESSION);
        assert_eq!((score.games, score.career_games), (WINDOW, WINDOW + 10));
        assert!(stat(&score, HeroDamage).percentile > 0.0);
        assert!(score.career > score.score);

        let points: u8 = score.pillars.iter().map(|pillar| pillar.points).sum();
        assert_eq!(Some(points), score.career);

        // One point per game from the first rated one, the last being the score.
        assert_eq!(score.history.len(), WINDOW + 10 - MIN_GAMES + 1);
        assert_eq!(score.history.last().map(|point| point.score), score.score);
        assert!(score.history[0].score > score.history[WINDOW].score);

        let [jaina] = &score.heroes[..] else {
            panic!("the owner only played Jaina");
        };
        assert_eq!((jaina.games, jaina.hero_samples), (WINDOW + 10, 0));
        assert_eq!(jaina.hero_weight, 0.0);
        assert_eq!(Some(jaina.score), score.career);
    }

    #[test]
    fn the_pillar_maxes_sum_to_100_unrated() {
        let score = compute(&games(1, |_| 1_000), heroes(), NO_SESSION);

        assert_eq!(score.career, None);
        assert_eq!(
            score
                .pillar_maxes
                .iter()
                .map(|pillar| pillar.max)
                .sum::<u8>(),
            100
        );
    }

    #[test]
    fn a_hero_history_follows_its_games_alone() {
        // Jaina on the odd games, out-damaging everyone, and Valla on a few even ones.
        let players: Vec<_> = (1..=40)
            .flat_map(|id| {
                let mut players = game(id, if id % 2 == 1 { 90_000 } else { 1_000 });
                if id % 2 == 0 && id <= 10 {
                    players[0].hero_id = VALLA;
                    players[0].hero_slug = "Valla".to_owned();
                }

                players
            })
            .collect();

        let score = compute(&players, heroes(), NO_SESSION);
        let hero = |id| score.heroes.iter().find(|hero| hero.hero_id == id).unwrap();

        let jaina = hero(JAINA);
        assert_eq!(jaina.history.len(), jaina.games - MIN_GAMES + 1);

        // Fewer games than the window, so the latest point spans all of Jaina's.
        assert_eq!(
            jaina.history.last().map(|point| point.score),
            Some(jaina.score)
        );

        let valla = hero(VALLA);
        assert_eq!((valla.games, valla.history.len()), (5, 0));
    }

    #[test]
    fn the_hero_weight_is_the_blend_applied() {
        // The owner on Valla, siege damage missing for some of the other Vallas.
        let mut players = games(12, |_| 30_000);
        for (index, player) in players.iter_mut().enumerate() {
            if player.is_owner {
                player.hero_id = VALLA;
                player.hero_slug = "Valla".to_owned();
            } else if index % 2 == 0 {
                player.siege_damage = None;
            }
        }
        let siege_samples = players
            .iter()
            .filter(|p| !p.is_owner && p.siege_damage.is_some())
            .count();

        let score = compute(&players, heroes(), NO_SESSION);
        let [valla] = &score.heroes[..] else {
            panic!("the owner only played Valla");
        };
        assert_eq!(valla.hero_samples, 12 * 4);
        assert!(valla.hero_weight < hero_weight(valla.hero_samples));
        assert!(valla.hero_weight > hero_weight(siege_samples));
    }
}
