use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::hero::HeroRole;
use super::hero_stats::HeroTotals;
use super::role_performances::RoleStat;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
    pub mvps: i64,
    pub main_role: Option<HeroRole>,
    pub recent: Vec<Option<bool>>,
}

/// The owner's career across every hero, for the profile header.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileCareer {
    /// `None` until the first replay is in.
    pub name: Option<String>,
    pub account_level: Option<i64>,
    #[serde(flatten)]
    pub totals: HeroTotals,
    pub mvps: i64,
    pub main_role: Option<HeroRole>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroStat {
    pub hero_id: i64,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapStat {
    pub id: String,
    pub name: String,
    pub loading_screen: Option<String>,
    pub games: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MostPlayedHeroes {
    pub played: i64,
    pub total: i64,
    pub heroes: Vec<HeroStat>,
}

/// The games a profile score reads, and the players it ranks the owner against.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ScoreScope {
    All,
    Draft,
    QuickMatch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ScorePillarId {
    Fighting,
    Survival,
    TeamRole,
    Map,
}

/// The owner's score out of 100 over their latest games, 50 being an average player
/// on the same heroes, split into the points each stat brought.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileScore {
    /// `None` under `min_games` scored games.
    pub score: Option<u8>,
    /// How far `score` could move through the swings between games alone.
    pub margin: Option<u8>,
    /// Scored games in the window.
    pub games: usize,
    /// The score over every scored game, `None` under `min_games` of them.
    pub career: Option<u8>,
    pub career_margin: Option<u8>,
    pub career_games: usize,
    /// The owner's games on a hero with a role, scored or not: those short of
    /// players to rank against go unscored.
    pub eligible_games: usize,
    /// Other players' games ranked against, a player counting once per game.
    pub baseline_players: usize,
    pub min_games: usize,
    pub window: usize,
    /// Over every scored game: their points sum to `career` and their maxes to 100.
    pub pillars: Vec<ScorePillar>,
    /// Over every scored game.
    pub heroes: Vec<HeroScoreRow>,
    /// The score after each game since the first rated one, oldest first, the last
    /// being the score. Every point ranks against today's players, so new games
    /// shift past ones too.
    pub history: Vec<ScorePoint>,
}

#[derive(Debug, Serialize)]
pub struct ScorePoint {
    pub timestamp: DateTime<Utc>,
    pub score: u8,
}

#[derive(Debug, Serialize)]
pub struct ScorePillar {
    pub id: ScorePillarId,
    pub points: u8,
    pub max: u8,
    /// The share of players the owner is ahead of on the part's stats, by weight.
    pub percentile: f64,
    pub stats: Vec<ScoreStat>,
}

#[derive(Debug, Serialize)]
pub struct ScoreStat {
    pub stat: RoleStat,
    /// The average share of other players the owner did better than, from 0 to 1.
    pub percentile: f64,
    pub points: u8,
    /// The points a game gives the stat on average.
    pub max: u8,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroScoreRow {
    pub hero_id: i64,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
    pub games: usize,
    pub score: u8,
    /// Games by other players on the hero the owner is compared with.
    pub hero_samples: usize,
    /// How much of the comparison is against the hero's players, the rest being
    /// against its role's, from 0 to 1.
    pub hero_weight: f64,
    pub pillars: Vec<ScorePillar>,
}

#[derive(Debug, FromRow)]
pub struct ScoredHero {
    pub id: i64,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
}
