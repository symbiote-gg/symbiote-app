//! The owner's latest games scored against other players: each stat a hero is
//! weighted on ranked among the same hero's players, and among its role's when few
//! played the hero, then averaged into points that sum to a score out of 100.

use std::borrow::Borrow;
use std::collections::HashMap;

use chrono::{DateTime, TimeDelta, Utc};
use sqlx::FromRow;

use crate::role_performances::{
    death_share, round_to_total, side, team_totals, TeamMember, TeamTotals, Weights,
};
use crate::types::hero::HeroRole;
use crate::types::replay::Mode;
use crate::types::role_performances::RoleStat::{
    self, DamageTakenShare, DeathShare, HardCc, Healing, HeroDamage, KillParticipation,
    MercCaptures, Protection, SiegeDamage, TeamfightDamageTakenShare, TeamfightHeroDamageShare,
    TimeDeadShare, Xp,
};
use crate::types::stats::{
    GameScore, HeroScoreRow, PillarMax, ProfileScore, ScorePillar, ScorePillarId, ScorePoint,
    ScoreScope, ScoreStat, ScoredHero,
};

/// The modes played five against five on a full map. ARAM's single lane inflates
/// damage and leaves no XP or siege to choose.
pub fn modes(scope: ScoreScope) -> &'static [Mode] {
    match scope {
        ScoreScope::All => &[
            Mode::QuickMatch,
            Mode::UnrankedDraft,
            Mode::StormLeague,
            Mode::HeroLeague,
            Mode::TeamLeague,
        ],
        ScoreScope::Draft => &[
            Mode::UnrankedDraft,
            Mode::StormLeague,
            Mode::HeroLeague,
            Mode::TeamLeague,
        ],
        ScoreScope::QuickMatch => &[Mode::QuickMatch],
    }
}

/// Shorter games are remakes and early leaves.
pub const MIN_GAME_SECS: i64 = 600;

const WINDOW: usize = 50;

const MIN_GAMES: usize = 10;

/// Same hero samples weigh `n / (n + BLEND_SAMPLES)` against the role's. The owner's
/// own games are left out and a hero can't repeat on a team, so a hero the owner
/// mostly plays is only sampled from mirror picks.
const BLEND_SAMPLES: f64 = 30.0;

/// Kits sit higher or lower in their role than their players' skill alone would put
/// them, so a hero's rank in the role is shifted back by where its samples sit, the
/// shift trusted `n / (n + OFFSET_SAMPLES)`. With few mirror samples, a main is
/// otherwise scored on the kit more than on their play.
const OFFSET_SAMPLES: f64 = 5.0;

/// Under this many samples in the role there's no one to rank against.
const MIN_ROLE_SAMPLES: usize = 30;

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

/// A stat most of a hero's players never put a number on isn't in its kit, so it
/// goes unscored rather than handing out a tie in the middle.
pub(crate) const NOT_IN_KIT: f64 = 0.75;

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
        "Azmodan" | "LostVikings" | "Murky" | "Probius" | "Sylvanas" | "WitchDoctor" | "Zagara" => {
            &[(Xp, 1), (SiegeDamage, 3), (MercCaptures, 1)]
        }
        _ if role == HeroRole::RangedAssassin => &[(Xp, 2), (SiegeDamage, 2), (MercCaptures, 1)],
        _ => &[(Xp, 2), (SiegeDamage, 1), (MercCaptures, 1)],
    };

    [fighting, survival_weights(slug), team_role, map]
}

pub(crate) fn survival_weights(slug: &str) -> Weights {
    match slug {
        // Time dead adds up all three Vikings' timers, while scoreboard deaths
        // only count full wipes.
        "LostVikings" => &[(DeathShare, 1)],
        _ => &[(DeathShare, 2), (TimeDeadShare, 1)],
    }
}

/// A player's game, in the order games were played, a game's players together.
#[derive(Debug, Clone, FromRow)]
#[cfg_attr(test, derive(Default))]
pub struct PlayerGame {
    pub game_id: i64,
    pub timestamp: DateTime<Utc>,
    pub duration: i64,
    pub team: i64,
    pub hero_id: i64,
    pub hero_slug: String,
    pub hero_role: Option<HeroRole>,
    pub takedowns: Option<i64>,
    pub deaths: Option<i64>,
    pub hero_damage: Option<i64>,
    pub siege_damage: Option<i64>,
    pub healing: Option<i64>,
    pub damage_taken: Option<i64>,
    pub teamfight_damage_taken: Option<i64>,
    pub teamfight_hero_damage: Option<i64>,
    pub xp: Option<i64>,
    pub hard_cc: Option<i64>,
    pub protection: Option<i64>,
    pub time_dead_secs: Option<f64>,
    pub merc_captures: Option<i64>,
    pub is_owner: bool,
    pub is_ai: bool,
}

impl TeamMember for PlayerGame {
    fn team(&self) -> i64 {
        self.team
    }

    fn deaths(&self) -> Option<i64> {
        self.deaths
    }

    fn damage_taken(&self) -> Option<i64> {
        self.damage_taken
    }

    fn teamfight_damage_taken(&self) -> Option<i64> {
        self.teamfight_damage_taken
    }
}

/// A game's team sums, with the ones replay role scores don't read.
pub(crate) struct GameTotals {
    team: TeamTotals,
    time_dead: [f64; 2],
    teamfight_hero_damage: [i64; 2],
}

pub(crate) fn game_totals(game: &[PlayerGame]) -> GameTotals {
    let mut time_dead = [0.0; 2];
    let mut teamfight_hero_damage = [0; 2];
    for player in game {
        let side = side(player);
        time_dead[side] += player.time_dead_secs.unwrap_or(0.0);
        teamfight_hero_damage[side] += player.teamfight_hero_damage.unwrap_or(0);
    }

    GameTotals {
        team: team_totals(game),
        time_dead,
        teamfight_hero_damage,
    }
}

/// Seconds dead standing in for one death in [`time_dead_share`].
const DEATH_SECS: f64 = 30.0;

/// Like [`death_share`], with every player given one more death's worth of time.
fn time_dead_share(secs: f64, team_secs: f64) -> f64 {
    (secs + DEATH_SECS) / (team_secs + 5.0 * DEATH_SECS)
}

pub(crate) fn lower_is_better(stat: RoleStat) -> bool {
    matches!(stat, DeathShare | TimeDeadShare)
}

/// The stat as ranked: raw stats per minute so game length doesn't count, the team
/// relative ones as in a replay's role scores.
pub(crate) fn rate(player: &PlayerGame, stat: RoleStat, totals: &GameTotals) -> Option<f64> {
    let side = side(player);
    let team = &totals.team;
    let per_minute = |value: Option<i64>| {
        (player.duration > 0).then_some(value? as f64 * 60.0 / player.duration as f64)
    };
    let share = |part: Option<i64>, team: i64| (team > 0).then_some(part? as f64 / team as f64);

    match stat {
        HeroDamage => per_minute(player.hero_damage),
        SiegeDamage => per_minute(player.siege_damage),
        Healing => per_minute(player.healing),
        Xp => per_minute(player.xp),
        HardCc => per_minute(player.hard_cc),
        Protection => per_minute(player.protection),
        KillParticipation => share(player.takedowns, team.deaths[1 - side]),
        // No pillar weighs it: team role reads damage taken in fights only.
        DamageTakenShare => None,
        TeamfightDamageTakenShare => share(
            player.teamfight_damage_taken,
            team.teamfight_damage_taken[side],
        ),
        DeathShare => Some(death_share(player.deaths?, team.deaths[side])),
        TimeDeadShare => Some(time_dead_share(
            player.time_dead_secs?,
            totals.time_dead[side],
        )),
        MercCaptures => per_minute(player.merc_captures),
        TeamfightHeroDamageShare => share(
            player.teamfight_hero_damage,
            totals.teamfight_hero_damage[side],
        ),
    }
}

/// `pillars` keeps its sums at each stat's discriminant. The match stops the build
/// when a stat is added, so the count is checked with it.
const STAT_COUNT: usize = match TeamfightHeroDamageShare {
    HeroDamage
    | SiegeDamage
    | Healing
    | DamageTakenShare
    | TeamfightDamageTakenShare
    | Xp
    | HardCc
    | Protection
    | KillParticipation
    | DeathShare
    | TimeDeadShare
    | MercCaptures
    | TeamfightHeroDamageShare => TeamfightHeroDamageShare as usize + 1,
};

/// Other players' sorted rates, by hero and by role.
#[derive(Default)]
struct Baselines {
    heroes: HashMap<(i64, RoleStat), Vec<f64>>,
    roles: HashMap<(HeroRole, RoleStat), Vec<f64>>,
    hero_games: HashMap<i64, usize>,
    hero_roles: HashMap<i64, HeroRole>,
    /// How far above the middle of its role a hero's samples rank, already shrunk by
    /// their count.
    kit_offsets: HashMap<(i64, RoleStat), f64>,
}

impl Baselines {
    fn add(&mut self, player: &PlayerGame, role: HeroRole, totals: &GameTotals) {
        *self.hero_games.entry(player.hero_id).or_default() += 1;
        self.hero_roles.insert(player.hero_id, role);

        for &stat in PILLARS.iter().flat_map(|(_, stats)| stats.iter()) {
            let Some(rate) = rate(player, stat, totals) else {
                continue;
            };

            self.heroes
                .entry((player.hero_id, stat))
                .or_default()
                .push(rate);
            self.roles.entry((role, stat)).or_default().push(rate);
        }
    }

    fn sort(&mut self) {
        for rates in self.heroes.values_mut().chain(self.roles.values_mut()) {
            rates.sort_by(f64::total_cmp);
        }

        for (&(hero_id, stat), hero_rates) in &self.heroes {
            let Some(role_rates) = self
                .hero_roles
                .get(&hero_id)
                .and_then(|&role| self.roles.get(&(role, stat)))
            else {
                continue;
            };

            let samples = hero_rates.len() as f64;
            let mean_rank = hero_rates.iter().map(|&r| rank(role_rates, r)).sum::<f64>() / samples;
            let trust = samples / (samples + OFFSET_SAMPLES);
            self.kit_offsets
                .insert((hero_id, stat), (mean_rank - 0.5) * trust);
        }
    }

    fn hero_games(&self, hero_id: i64) -> usize {
        self.hero_games.get(&hero_id).copied().unwrap_or(0)
    }

    /// How much the stat's rank is read against the hero's players rather than the
    /// role's, from the hero's samples of that stat.
    fn hero_blend(&self, hero_id: i64, stat: RoleStat) -> f64 {
        self.heroes
            .get(&(hero_id, stat))
            .map_or(0.0, |rates| hero_weight(rates.len()))
    }

    /// The share of other players the rate does better than, from 0 to 1.
    fn percentile(&self, hero_id: i64, role: HeroRole, stat: RoleStat, rate: f64) -> Option<f64> {
        let role_rates = self.roles.get(&(role, stat))?;
        if role_rates.len() < MIN_ROLE_SAMPLES {
            return None;
        }

        let hero_rates = self.heroes.get(&(hero_id, stat));
        let weight = self.hero_blend(hero_id, stat);

        let zeros = weight * hero_rates.map_or(0.0, |rates| zero_share(rates))
            + (1.0 - weight) * zero_share(role_rates);
        if zeros > NOT_IN_KIT {
            return None;
        }

        let in_role = rank(role_rates, rate);
        let blended = match hero_rates {
            Some(hero_rates) => {
                let offset = self.kit_offsets.get(&(hero_id, stat)).copied();
                let in_role = (in_role - offset.unwrap_or(0.0)).clamp(0.0, 1.0);
                weight * rank(hero_rates, rate) + (1.0 - weight) * in_role
            }
            None => in_role,
        };

        Some(if lower_is_better(stat) {
            1.0 - blended
        } else {
            blended
        })
    }
}

pub(crate) fn hero_weight(samples: usize) -> f64 {
    let samples = samples as f64;
    samples / (samples + BLEND_SAMPLES)
}

/// The share of `sorted` under the rate, ties counting half so a rate everyone
/// shares sits in the middle.
pub(crate) fn rank(sorted: &[f64], rate: f64) -> f64 {
    let below = sorted.partition_point(|&r| r < rate);
    let up_to = sorted.partition_point(|&r| r <= rate);

    (below + up_to) as f64 / (2 * sorted.len()) as f64
}

pub(crate) fn zero_share(sorted: &[f64]) -> f64 {
    sorted.partition_point(|&r| r <= 0.0) as f64 / sorted.len() as f64
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
    baselines: &Baselines,
) -> Option<ScoredGame> {
    let ranked: Vec<(f64, Vec<_>)> = pillar_weights(&player.hero_slug, role)
        .iter()
        .zip(PILLAR_SHARES)
        .map(|(weights, share)| {
            let stats = weights
                .iter()
                .filter_map(|&(stat, weight)| {
                    let rate = rate(player, stat, totals)?;
                    let percentile = baselines.percentile(player.hero_id, role, stat, rate)?;
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
        .map(|&(stat, weight, _)| weight * baselines.hero_blend(player.hero_id, stat))
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

fn points(score: f64) -> u8 {
    (score * 100.0).round() as u8
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
    baselines: &Baselines,
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
                hero_samples: baselines.hero_games(hero.id),
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

    let mut baselines = Baselines::default();
    let mut baseline_players = 0;
    for (game, totals) in games.iter().zip(&totals) {
        for player in game.iter().filter(|p| !p.is_owner && !p.is_ai) {
            if let Some(role) = player.hero_role {
                baselines.add(player, role, totals);
                baseline_players += 1;
            }
        }
    }
    baselines.sort();

    let scored: Vec<_> = games
        .iter()
        .zip(&totals)
        .flat_map(|(game, totals)| {
            let baselines = &baselines;
            game.iter()
                .filter(|p| p.is_owner)
                .filter_map(move |owner| score_game(owner, owner.hero_role?, totals, baselines))
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
        baseline_players,
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
            hero_rows(&scored, heroes, &baselines, session_start)
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
    fn ties_rank_in_the_middle() {
        assert_eq!(rank(&[1.0, 2.0, 2.0, 3.0], 2.0), 0.5);
        assert_eq!(rank(&[5.0], 5.0), 0.5);
        assert_eq!(rank(&[5.0], 6.0), 1.0);
        assert_eq!(rank(&[5.0], 4.0), 0.0);
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
    fn few_same_hero_samples_lean_on_the_role() {
        let mut baselines = Baselines::default();
        let role = HeroRole::RangedAssassin;
        baselines
            .roles
            .insert((role, HeroDamage), (1..=40).map(f64::from).collect());

        let unseen = baselines.percentile(JAINA, role, HeroDamage, 10.5);
        assert_eq!(unseen, Some(0.25));

        // As many samples as the blend's own count weigh half.
        baselines
            .heroes
            .insert((JAINA, HeroDamage), vec![1.0; BLEND_SAMPLES as usize]);
        let seen = baselines.percentile(JAINA, role, HeroDamage, 10.5);
        assert_eq!(seen, Some(0.5 * 1.0 + 0.5 * 0.25));
    }

    #[test]
    fn a_kit_above_its_role_is_pulled_back() {
        let mut baselines = Baselines::default();
        let role = HeroRole::RangedAssassin;
        baselines
            .roles
            .insert((role, HeroDamage), (1..=40).map(f64::from).collect());
        baselines
            .heroes
            .insert((JAINA, HeroDamage), (31..=40).map(f64::from).collect());
        baselines.hero_roles.insert(JAINA, role);
        baselines.sort();

        // Jaina's samples rank 0.875 in the role on average, trusted 10 / 15, so her
        // rank in the role is shifted down by 0.25. Her median player ranks 0.5 among
        // Jainas and 0.875 in the role, weighing 10 / 40 and 30 / 40.
        let median = baselines.percentile(JAINA, role, HeroDamage, 35.5).unwrap();
        let expected = 0.25 * 0.5 + 0.75 * (0.875 - 0.25);
        assert!((median - expected).abs() < 1e-9, "{median}");
    }

    #[test]
    fn a_thin_role_ranks_nothing() {
        let mut baselines = Baselines::default();
        let role = HeroRole::RangedAssassin;
        let rates = (1..MIN_ROLE_SAMPLES).map(|r| r as f64).collect();
        baselines.roles.insert((role, HeroDamage), rates);

        assert_eq!(baselines.percentile(JAINA, role, HeroDamage, 10.0), None);
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
    fn a_stat_outside_the_kit_goes_unscored() {
        let mut baselines = Baselines::default();
        let role = HeroRole::RangedAssassin;
        let mostly_zero = (0..40).map(|i| if i < 35 { 0.0 } else { 100.0 }).collect();
        baselines.roles.insert((role, Healing), mostly_zero);

        assert_eq!(baselines.percentile(JAINA, role, Healing, 50.0), None);

        // A hero whose players do heal outweighs the role.
        baselines
            .heroes
            .insert((JAINA, Healing), vec![100.0; 4 * BLEND_SAMPLES as usize]);
        assert!(baselines.percentile(JAINA, role, Healing, 50.0).is_some());
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
