use chrono::{DateTime, Utc};
use serde::Serialize;

use super::{Mode, ReplayWithPlayers};
use crate::types::hero::Hero;
use crate::types::player::Player;

#[derive(Debug)]
pub struct NewReplay {
    pub hash: String,
    pub path: String,
    pub game_id: String,
    pub timestamp: DateTime<Utc>,
    pub mode: Mode,
    pub map: String,
    pub owner_hero_slug: String,
    pub owner_toon: String,
    pub owner_win: Option<bool>,
    pub duration: i64,
    pub game_loops: i64,
    pub gates_open_loop: i64,
    pub is_new: bool,
    pub ingest_version: i64,
}

#[derive(Debug)]
pub struct NewReplayPlayer {
    pub toon: String,
    pub slot: i64,
    pub team: i64,
    pub hero_slug: String,
    pub time_dead_secs: Option<f64>,
    pub time_on_fire_secs: Option<f64>,
    pub upvotes: i64,
    pub party: Option<i64>,
    pub xp: Option<serde_json::Value>,
    pub score: serde_json::Value,
    pub talents: Vec<NewTalent>,
    pub awards: Vec<String>,
}

#[derive(Debug)]
pub struct NewTalent {
    pub tier: i64,
    pub slug: String,
    pub gameloop: i64,
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
    /// Toons of the premade party the owner queued with, owner included; empty when solo.
    pub owner_party: Vec<String>,
    /// The stored replay this one re-parses, keeping its id, or `None` for a new one.
    pub refreshes: Option<i64>,
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
