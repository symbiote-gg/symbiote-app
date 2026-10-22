use std::collections::BTreeMap;

use hots_replay_parser::summary::Lane;
use serde::Serialize;
use sqlx::types::Json;
use sqlx::FromRow;

/// A stored event row, timed in seconds since the gates opened.
#[derive(Debug, FromRow)]
pub struct RawEvent {
    pub kind: String,
    pub time: f64,
    pub team: Option<i64>,
    pub data: Json<serde_json::Value>,
}

/// What happened over a game, read from its event rows. Events before the gates
/// opened are left out.
#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Timeline {
    pub deaths: Vec<Death>,
    pub structures: Vec<Structure>,
    pub camps: Vec<Camp>,
    /// Each team's level-ups as `(time, level)`, starting at level 1 at 0.
    pub levels: [Vec<(f64, u32)>; 2],
    pub objectives: Vec<Objective>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Death {
    pub time: f64,
    /// The victim's team.
    pub team: Option<u8>,
    pub victim: u8,
    pub killers: Vec<u8>,
    /// `None` when no hero landed it: minions, structures, mercenaries.
    pub killing_blow: Option<u8>,
    /// `None` when unknown, e.g. replays ingested before it was tracked.
    pub alone: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Structure {
    pub time: f64,
    /// The team that owned it.
    pub team: Option<u8>,
    pub keep: bool,
    /// `None` on maps without distinct lanes.
    pub lane: Option<Lane>,
    pub killers: Vec<u8>,
    /// `None` when no hero landed it: minions, mercenaries.
    pub killing_blow: Option<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Camp {
    pub time: f64,
    pub team: Option<u8>,
    pub camp_type: Option<String>,
    /// Which capture of this camp it is, from 1.
    pub nth: u32,
}

/// A map objective event, with what its map makes of it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Objective {
    pub time: f64,
    pub kind: String,
    /// The team that gained from it.
    pub team: Option<u8>,
    /// Picks a glyph and label among the kind's, e.g. a punisher's type.
    pub variant: Option<&'static str>,
    pub race: Option<Race>,
    /// A state's start and end.
    pub held: Option<(f64, f64)>,
    pub summon: Option<Summon>,
    pub duel: Option<Duel>,
    pub altar: Option<Altar>,
    pub knight: Option<Knight>,
    /// The event's own values, only for kinds no map knows.
    pub raw: Option<RawData>,
}

/// Both teams' progress towards one objective.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Race {
    pub kind: RaceKind,
    pub team_values: [f64; 2],
    pub unit: Option<RaceUnit>,
    /// The team listed first, else the leader.
    pub top_team: Option<u8>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RaceKind {
    Capture,
    Curse,
    Gems,
    Golem,
    Shrine,
    Ship,
    Temple,
    Wave,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RaceUnit {
    Percent,
}

/// A summoned unit's life, spawn to death, and the damage it did.
#[derive(Debug, Serialize)]
pub struct Summon {
    pub range: (f64, f64),
    pub siege: i64,
    pub heroes: i64,
}

/// An immortal fight: who won and how much of their immortal survived.
#[derive(Debug, Serialize)]
pub struct Duel {
    pub range: (f64, f64),
    pub winner: u8,
    pub power: i64,
}

/// An altar capture: the firing team and the towns adding shots to its core.
#[derive(Debug, Serialize)]
pub struct Altar {
    pub winner: u8,
    pub towns: i64,
}

/// A Dragon Knight's ride: its pilot and what they took down while it lived.
#[derive(Debug, Serialize)]
pub struct Knight {
    /// The end is `None` when the knight outlived the game.
    pub range: (f64, Option<f64>),
    pub pilot: u8,
    pub takedowns: usize,
    pub structures: usize,
}

#[derive(Debug, Serialize)]
pub struct RawData {
    pub ints: BTreeMap<String, i64>,
    pub strings: BTreeMap<String, String>,
}
