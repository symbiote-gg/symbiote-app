//! A game's stats as ranked across games: each player's rates, per minute or as a
//! share of their team's, and the team sums they're read against.

pub mod baseline;
pub mod heroes;

use chrono::{DateTime, Utc};
use sqlx::FromRow;

use crate::types::hero::HeroRole;
use crate::types::role_performances::RoleStat::{
    self, DamageTakenShare, DeathShare, HardCc, Healing, HeroDamage, KillParticipation,
    MercCaptures, Protection, SiegeDamage, TeamfightDamageTakenShare, TeamfightHeroDamageShare,
    TimeDeadShare, Xp,
};

/// How much each stat counts toward a hero's score, up to 3.
pub type Weights = &'static [(RoleStat, u8)];

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
pub struct GameTotals {
    team: TeamTotals,
    time_dead: [f64; 2],
    teamfight_hero_damage: [i64; 2],
}

pub fn game_totals(game: &[PlayerGame]) -> GameTotals {
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

pub fn lower_is_better(stat: RoleStat) -> bool {
    matches!(stat, DeathShare | TimeDeadShare)
}

/// The stat as ranked: raw stats per minute so game length doesn't count, the team
/// relative ones as in a replay's role scores.
pub fn rate(player: &PlayerGame, stat: RoleStat, totals: &GameTotals) -> Option<f64> {
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
        KillParticipation => kill_participation(player.takedowns?, team.deaths[1 - side]),
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

/// How many stats there are, for arrays kept at each stat's discriminant. The match
/// stops the build when a stat is added, so the count is checked with it.
pub const STAT_COUNT: usize = match TeamfightHeroDamageShare {
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

/// Each team's sums the team relative stats are read against, so a team's kill lead
/// doesn't lift all its roles at once, nor a lost fight's damage sink them. A team's
/// deaths are also the other team's kills.
#[derive(Default)]
pub struct TeamTotals {
    pub deaths: [i64; 2],
    pub damage_taken: [i64; 2],
    pub teamfight_damage_taken: [i64; 2],
}

/// A player as their team's sums read them.
pub trait TeamMember {
    fn team(&self) -> i64;
    fn deaths(&self) -> Option<i64>;
    fn damage_taken(&self) -> Option<i64>;
    fn teamfight_damage_taken(&self) -> Option<i64>;
}

pub fn team_totals(players: &[impl TeamMember]) -> TeamTotals {
    let mut totals = TeamTotals::default();
    for player in players {
        let side = side(player);
        totals.deaths[side] += player.deaths().unwrap_or(0);
        totals.damage_taken[side] += player.damage_taken().unwrap_or(0);
        totals.teamfight_damage_taken[side] += player.teamfight_damage_taken().unwrap_or(0);
    }

    totals
}

pub fn side(player: &impl TeamMember) -> usize {
    usize::from(player.team() == 1)
}

/// The player's takedowns as a share of the enemy team's scoreboard deaths. Both
/// leave out the deaths the scoreboard skips, like a lone Viking's, so it never goes
/// over 1. `None` when no enemy died.
pub fn kill_participation(takedowns: i64, enemy_deaths: i64) -> Option<f64> {
    (enemy_deaths > 0).then(|| takedowns as f64 / enemy_deaths as f64)
}

/// A death added to the hero and five to the team, pulling few deaths toward an even
/// fifth so a team that barely died doesn't swing it, and keeping no deaths defined.
pub fn death_share(deaths: i64, team_deaths: i64) -> f64 {
    (deaths + 1) as f64 / (team_deaths + 5) as f64
}

/// A score from 0 to 1 as whole points out of 100.
pub fn points(score: f64) -> u8 {
    (score * 100.0).round() as u8
}

/// Rounds each value by largest remainder, so they sum to `total` rather than
/// drifting a point off it.
pub fn round_to_total(raw: &[f64], total: u8) -> Vec<u8> {
    let mut rounded: Vec<u8> = raw.iter().map(|r| r.floor() as u8).collect();

    let floored: u8 = rounded.iter().sum();
    let leftover = usize::from(total.saturating_sub(floored));

    let mut by_remainder: Vec<usize> = (0..raw.len()).collect();
    by_remainder.sort_by(|&a, &b| (raw[b] - raw[b].floor()).total_cmp(&(raw[a] - raw[a].floor())));
    for &index in by_remainder.iter().take(leftover) {
        rounded[index] += 1;
    }

    rounded
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Five players a team, each with `deaths` and `time_dead_secs`.
    fn game(deaths: [i64; 10], time_dead: [f64; 10]) -> Vec<PlayerGame> {
        (0..10)
            .map(|index| PlayerGame {
                team: i64::from(index >= 5),
                duration: 600,
                deaths: Some(deaths[index]),
                time_dead_secs: Some(time_dead[index]),
                ..Default::default()
            })
            .collect()
    }

    #[test]
    fn raw_stats_rate_per_minute() {
        let mut players = game([0; 10], [0.0; 10]);
        players[0].hero_damage = Some(30_000);
        let totals = game_totals(&players);

        assert_eq!(rate(&players[0], HeroDamage, &totals), Some(3_000.0));
        assert_eq!(rate(&players[0], SiegeDamage, &totals), None);

        players[0].duration = 0;
        assert_eq!(rate(&players[0], HeroDamage, &totals), None);
    }

    #[test]
    fn kill_participation_reads_the_enemy_deaths() {
        let mut players = game([0, 0, 0, 0, 0, 2, 2, 0, 0, 0], [0.0; 10]);
        players[0].takedowns = Some(3);
        let totals = game_totals(&players);
        assert_eq!(rate(&players[0], KillParticipation, &totals), Some(0.75));

        // No enemy died, so there's nothing to take part in.
        let players = game([1, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0.0; 10]);
        let totals = game_totals(&players);
        assert_eq!(rate(&players[5], KillParticipation, &totals), None);
    }

    #[test]
    fn deaths_lean_toward_an_even_fifth() {
        assert_eq!(death_share(0, 0), 0.2);
        assert_eq!(death_share(4, 5), 0.5);

        let players = game(
            [2, 1, 1, 0, 0, 0, 0, 0, 0, 0],
            [60.0, 30.0, 30.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        );
        let totals = game_totals(&players);
        assert_eq!(rate(&players[0], DeathShare, &totals), Some(3.0 / 9.0));
        assert_eq!(
            rate(&players[0], TimeDeadShare, &totals),
            Some(90.0 / 270.0)
        );
        assert!(lower_is_better(DeathShare) && lower_is_better(TimeDeadShare));
        assert!(!lower_is_better(KillParticipation));
    }

    #[test]
    fn shares_read_the_players_own_team() {
        let mut players = game([0; 10], [0.0; 10]);
        for (index, player) in players.iter_mut().enumerate() {
            player.teamfight_hero_damage = Some(if index < 5 { 1_000 } else { 9_000 });
        }
        let totals = game_totals(&players);

        assert_eq!(
            rate(&players[0], TeamfightHeroDamageShare, &totals),
            Some(0.2)
        );
        assert_eq!(
            rate(&players[9], TeamfightHeroDamageShare, &totals),
            Some(0.2)
        );
    }

    #[test]
    fn rounded_points_keep_their_total() {
        assert_eq!(round_to_total(&[33.4, 33.3, 33.3], 100), [34, 33, 33]);
        assert_eq!(points(0.555), 56);
    }
}
