use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::{AwardInfo, Mode, Replay};
use crate::types::hero::HeroRole;

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerInfo {
    pub player_id: i64,
    pub name: String,
    pub slot: i64,
    pub team: i64,
    pub hero_id: i64,
    pub hero_name: String,
    pub hero_portrait: Option<String>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerStats {
    pub owner_kills: Option<i64>,
    pub owner_deaths: Option<i64>,
    pub owner_assists: Option<i64>,
    pub owner_takedowns: Option<i64>,
    pub owner_hero_damage: Option<i64>,
    /// Whether the owner's hero damage is in the top 10% of their games on that hero.
    pub owner_hero_damage_top: bool,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayWithPlayers {
    #[serde(flatten)]
    #[sqlx(flatten)]
    pub replay: Replay,
    #[serde(flatten)]
    #[sqlx(flatten)]
    pub owner_stats: OwnerStats,
    pub hero_name: String,
    pub hero_role: Option<HeroRole>,
    pub hero_portrait: Option<String>,
    #[sqlx(skip)]
    pub players: Vec<ReplayPlayerInfo>,
    #[sqlx(skip)]
    pub owner_awards: Vec<AwardInfo>,
}

/// Where a page starts: right after the replay with this `id`, whose sort key is `value`.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct ReplayCursor {
    /// Unix seconds when sorting by date played.
    pub value: Option<i64>,
    pub id: i64,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ReplaySortColumn {
    #[default]
    Played,
    GameTime,
    HeroDamage,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct ReplaySort {
    pub column: ReplaySortColumn,
    pub desc: bool,
}

impl Default for ReplaySort {
    fn default() -> Self {
        Self {
            column: ReplaySortColumn::Played,
            desc: true,
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ReplayFilters {
    pub modes: Vec<Mode>,
    pub maps: Vec<String>,
    pub heroes: Vec<i64>,
    pub roles: Vec<HeroRole>,
    pub win: Option<bool>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPage {
    pub replays: Vec<ReplayWithPlayers>,
    pub total: i64,
}
