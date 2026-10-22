use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use super::hero::{Hero, HeroRole};
use super::player::Player;
use super::timeline::Timeline;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, sqlx::Type)]
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
    pub owner_hero_id: String,
    pub owner_player_id: String,
    pub owner_win: Option<bool>,
    pub duration: i64,
    pub is_new: bool,
}

#[derive(Debug)]
pub struct NewReplay {
    pub hash: String,
    pub path: String,
    pub game_id: String,
    pub timestamp: DateTime<Utc>,
    pub mode: Mode,
    pub map: String,
    pub owner_hero_id: String,
    pub owner_player_id: String,
    pub owner_win: Option<bool>,
    pub duration: i64,
    pub game_loops: i64,
    pub gates_open_loop: i64,
    pub is_new: bool,
    pub ingest_version: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerInfo {
    pub player_id: String,
    pub name: String,
    pub slot: i64,
    pub team: i64,
    pub hero_id: String,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerStats {
    pub owner_kills: Option<i64>,
    pub owner_deaths: Option<i64>,
    pub owner_assists: Option<i64>,
    pub owner_takedowns: Option<i64>,
    pub owner_hero_damage: Option<i64>,
    pub owner_mvp: bool,
    /// Whether the owner's hero damage is in the top 10% of their games on that hero.
    pub owner_hero_damage_top: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayWithPlayers {
    #[serde(flatten)]
    pub replay: Replay,
    #[serde(flatten)]
    pub owner_stats: OwnerStats,
    pub hero_name: String,
    pub hero_role: Option<HeroRole>,
    pub hero_portrait: Option<String>,
    pub players: Vec<ReplayPlayerInfo>,
    pub owner_awards: Vec<AwardInfo>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TalentPick {
    pub tier: i64,
    pub talent_id: String,
    pub gameloop: i64,
    pub name: Option<String>,
    pub icon: Option<String>,
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

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPlayerDetail {
    pub player_id: String,
    pub name: String,
    pub slot: i64,
    pub team: i64,
    pub hero_id: String,
    pub hero_name: String,
    pub hero_portrait: Option<String>,
    pub kills: Option<i64>,
    pub assists: Option<i64>,
    pub deaths: Option<i64>,
    pub hero_damage: Option<i64>,
    pub siege_damage: Option<i64>,
    pub healing: Option<i64>,
    pub self_healing: Option<i64>,
    pub damage_taken: Option<i64>,
    pub xp: Option<i64>,
    pub upvotes: i64,
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
    pub xp: Vec<XpSample>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayIngested {
    pub replay: ReplayWithPlayers,
    pub removed: Option<i64>,
    /// Whether it was already stored and got re-parsed in place.
    pub refreshed: bool,
    pub total: i64,
}

#[derive(Debug, Clone, Copy, Deserialize)]
pub struct ReplayCursor {
    pub timestamp: DateTime<Utc>,
    pub id: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplayPage {
    pub replays: Vec<ReplayWithPlayers>,
    pub total: i64,
}

#[derive(Debug)]
pub struct NewReplayPlayer {
    pub player_id: String,
    pub slot: i64,
    pub team: i64,
    pub hero_id: String,
    pub time_dead_secs: Option<f64>,
    pub upvotes: i64,
    pub xp: Option<serde_json::Value>,
    pub score: serde_json::Value,
    pub talents: Vec<NewTalent>,
    pub awards: Vec<String>,
}

#[derive(Debug)]
pub struct NewTalent {
    pub tier: i64,
    pub talent_id: String,
    pub gameloop: i64,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct XpSample {
    pub time: f64,
    pub team: i64,
    pub level: i64,
    pub total: f64,
}

#[derive(Debug)]
pub struct NewEvent {
    pub kind: String,
    pub gameloop: i64,
    pub team: Option<i64>,
    pub data: serde_json::Value,
}

#[derive(Debug)]
pub struct NewReplayBundle {
    pub replay: NewReplay,
    pub heroes: Vec<Hero>,
    pub players: Vec<Player>,
    pub replay_players: Vec<NewReplayPlayer>,
    pub events: Vec<NewEvent>,
    /// The stored replay this one re-parses, keeping its id, or `None` for a new one.
    pub refreshes: Option<i64>,
}
