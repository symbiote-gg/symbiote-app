use serde::Serialize;
use sqlx::FromRow;

use super::{AwardInfo, Replay};
use crate::types::hero::HeroRole;
use crate::types::role_performances::RolePerformance;
use crate::types::timeline::{KillLog, Timeline};

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TalentPick {
    pub tier: i64,
    pub talent_id: i64,
    pub slug: String,
    pub gameloop: i64,
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, FromRow, Serialize)]
#[cfg_attr(test, derive(Default))]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerDetail {
    pub player_id: i64,
    pub name: String,
    pub slot: i64,
    pub team: i64,
    pub hero_id: i64,
    pub hero_slug: String,
    pub hero_name: String,
    pub hero_role: Option<HeroRole>,
    pub hero_portrait: Option<String>,
    pub kills: Option<i64>,
    pub assists: Option<i64>,
    pub deaths: Option<i64>,
    pub takedowns: Option<i64>,
    pub hero_damage: Option<i64>,
    pub siege_damage: Option<i64>,
    pub healing: Option<i64>,
    pub self_healing: Option<i64>,
    pub damage_taken: Option<i64>,
    pub teamfight_damage_taken: Option<i64>,
    pub xp: Option<i64>,
    /// Seconds of stuns, roots and silences on enemy heroes.
    pub hard_cc: Option<i64>,
    /// Damage prevented on allies, by shields or damage reduction.
    pub protection: Option<i64>,
    pub time_dead: Option<f64>,
    pub time_on_fire: Option<f64>,
    pub upvotes: i64,
    pub party: Option<i64>,
    #[sqlx(skip)]
    pub talents: Vec<TalentPick>,
    #[sqlx(skip)]
    pub awards: Vec<AwardInfo>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayDetail {
    #[serde(flatten)]
    #[sqlx(flatten)]
    pub replay: Replay,
    pub hero_name: String,
    pub hero_role: Option<HeroRole>,
    pub hero_portrait: Option<String>,
    #[sqlx(skip)]
    pub players: Vec<ReplayPlayerDetail>,
    #[sqlx(skip)]
    pub timeline: Timeline,
    #[sqlx(skip)]
    pub kill_log: KillLog,
    #[sqlx(skip)]
    pub teams: [TeamSummary; 2],
    #[sqlx(skip)]
    pub owner_kill_participation: Option<f64>,
    #[sqlx(skip)]
    pub role_performances: Vec<RolePerformance>,
    #[sqlx(skip)]
    pub flow: Option<GameFlow>,
    #[sqlx(skip)]
    pub on_disk: bool,
    /// Whether it was played too long ago to keep its events, so it has no timeline or levels.
    #[sqlx(skip)]
    pub events_expired: bool,
}

/// How a game went for its winner.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum GameFlow {
    /// Never behind, with a wide margin or forts taken fast.
    Stomp,
    /// Clearly behind on XP for long or down forts, then won.
    Comeback,
    /// Even XP, kills and forts.
    Close,
    /// Ahead for most of the game, never clearly behind.
    Controlled,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamSummary {
    pub kills: i64,
    pub assists: i64,
    pub deaths: i64,
    pub ai_kills: i64,
    pub level: Option<u32>,
}
