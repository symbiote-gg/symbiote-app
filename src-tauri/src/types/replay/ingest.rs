use chrono::{DateTime, Utc};
use serde::Serialize;

use super::{Mode, ReplayWithPlayers};
use crate::types::hero::Hero;
use crate::types::player::Player;

#[derive(Debug)]
pub struct NewReplay {
    pub hash: String,
    pub path: String,
    /// Identifies the game across its files, whichever account recorded them.
    pub game_key: String,
    pub timestamp: DateTime<Utc>,
    pub mode: Mode,
    pub map: String,
    pub owner_toon: String,
    pub winner_team: Option<i64>,
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
    pub score: NewScore,
    pub talents: Vec<NewTalent>,
    pub awards: Vec<String>,
}

/// A player's scoreboard stats, `None` for the ones the replay lacks.
#[derive(Debug, Default, PartialEq)]
pub struct NewScore {
    pub kills: Option<i64>,
    pub deaths: Option<i64>,
    pub assists: Option<i64>,
    pub takedowns: Option<i64>,
    pub hero_damage: Option<i64>,
    pub siege_damage: Option<i64>,
    pub minion_damage: Option<i64>,
    pub healing: Option<i64>,
    pub self_healing: Option<i64>,
    pub damage_taken: Option<i64>,
    pub teamfight_damage_taken: Option<i64>,
    pub teamfight_hero_damage: Option<i64>,
    pub xp_contribution: Option<i64>,
    pub time_stunning: Option<i64>,
    pub time_rooting: Option<i64>,
    pub time_silencing: Option<i64>,
    pub protection: Option<i64>,
    pub regen_globes: Option<i64>,
    pub merc_camp_captures: Option<i64>,
}

impl NewScore {
    /// The `games_players` columns the stats are stored in, in the order of
    /// [`values`](Self::values).
    pub const COLUMNS: [&str; 19] = [
        "kills",
        "deaths",
        "assists",
        "takedowns",
        "hero_damage",
        "siege_damage",
        "minion_damage",
        "healing",
        "self_healing",
        "damage_taken",
        "teamfight_damage_taken",
        "teamfight_hero_damage",
        "xp_contribution",
        "time_stunning",
        "time_rooting",
        "time_silencing",
        "protection",
        "regen_globes",
        "merc_camp_captures",
    ];

    pub fn values(&self) -> [Option<i64>; 19] {
        [
            self.kills,
            self.deaths,
            self.assists,
            self.takedowns,
            self.hero_damage,
            self.siege_damage,
            self.minion_damage,
            self.healing,
            self.self_healing,
            self.damage_taken,
            self.teamfight_damage_taken,
            self.teamfight_hero_damage,
            self.xp_contribution,
            self.time_stunning,
            self.time_rooting,
            self.time_silencing,
            self.protection,
            self.regen_globes,
            self.merc_camp_captures,
        ]
    }
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
    /// Whether it was already stored and got re-parsed in place.
    pub refreshed: bool,
    pub total: i64,
}
