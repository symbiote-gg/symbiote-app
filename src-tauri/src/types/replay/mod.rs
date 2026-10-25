mod detail;
mod ingest;
mod list;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

pub use detail::*;
pub use ingest::*;
pub use list::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum Mode {
    QuickMatch,
    VersusAi,
    Brawl,
    UnrankedDraft,
    HeroLeague,
    TeamLeague,
    StormLeague,
    Aram,
    Custom,
    Unknown,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Replay {
    pub id: i64,
    pub hash: String,
    pub path: String,
    pub ingest_date: DateTime<Utc>,
    pub timestamp: DateTime<Utc>,
    pub mode: Mode,
    pub map: String,
    pub map_name: String,
    pub map_loading_screen: Option<String>,
    pub owner_hero_id: i64,
    pub owner_player_id: i64,
    pub owner_slot: i64,
    pub owner_team: i64,
    pub owner_win: Option<bool>,
    pub duration: i64,
    pub is_new: bool,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AwardInfo {
    #[serde(rename = "type")]
    pub award: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
}
