use std::collections::BTreeMap;

use hots_replay_parser::summary::Lane;
use serde::{Deserialize, Serialize};
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

/// A team's or player's XP split by where it came from. Stored rows may miss keys,
/// which read back as 0.
#[derive(Debug, Default, Deserialize)]
#[serde(default)]
pub struct XpBreakdown {
    pub minion: f64,
    pub creep: f64,
    pub structure: f64,
    pub hero: f64,
    pub trickle: f64,
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
    /// Each team's total XP so far as `(time, xp)`, sampled every minute.
    #[serde(skip)]
    pub xp: [Vec<(f64, f64)>; 2],
    pub objectives: Vec<Objective>,
    /// The deaths grouped into fights, in time order.
    pub fights: Vec<Fight>,
    pub milestones: Vec<Milestone>,
}

/// Deaths close enough in time and on the map to be one fight.
#[derive(Debug, Serialize)]
pub struct Fight {
    pub start: f64,
    pub end: f64,
    /// Indices into the timeline's deaths.
    pub deaths: Vec<usize>,
    pub kind: FightKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FightKind {
    TeamFight,
    Skirmish,
    /// A lone hero taken down by several.
    Gank,
    Pick,
}

/// The deaths a player took part in, and the kills the deaths can't place.
#[derive(Debug, Default, Serialize)]
pub struct KillLog {
    pub entries: Vec<KillLogEntry>,
    pub unplaced: Option<UnplacedKills>,
}

#[derive(Debug, Serialize)]
pub struct KillLogEntry {
    /// Index into the timeline's deaths.
    pub death: usize,
    pub kind: DeathKind,
    pub role: DeathRole,
}

/// A death's fight kind, or `Solo` for a lone kill by one hero, `Ai` when no hero
/// took part.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DeathKind {
    TeamFight,
    Skirmish,
    Gank,
    Pick,
    Solo,
    Ai,
}

impl From<FightKind> for DeathKind {
    fn from(kind: FightKind) -> Self {
        match kind {
            FightKind::TeamFight => Self::TeamFight,
            FightKind::Skirmish => Self::Skirmish,
            FightKind::Gank => Self::Gank,
            FightKind::Pick => Self::Pick,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DeathRole {
    Kill,
    Assist,
    Death,
}

/// Scoreboard kills no death places, e.g. on Leoric, whose deaths record no killing
/// blow, or landed by a structure yet credited to a hero.
#[derive(Debug, PartialEq, Serialize)]
pub struct UnplacedKills {
    /// The heroes they can be on.
    pub victims: Vec<u8>,
    pub count: i64,
    /// Indices into the timeline's deaths: the takedowns with no killing blow on
    /// record that credit the player.
    pub deaths: Vec<usize>,
}

/// The first team to reach a point of the game.
#[derive(Debug, Serialize)]
pub struct Milestone {
    pub kind: MilestoneKind,
    pub team: u8,
    pub time: f64,
}

/// Which first it is: the first kill, non-keep structure or team to reach level 10.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum MilestoneKind {
    #[serde(rename = "firstBlood")]
    Blood,
    #[serde(rename = "firstFort")]
    Fort,
    #[serde(rename = "firstTen")]
    Ten,
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
    /// Where, in map units. `None` on replays ingested before it was tracked.
    #[serde(skip_serializing)]
    pub x: Option<f64>,
    #[serde(skip_serializing)]
    pub y: Option<f64>,
    /// Living teammates near the victim as it died: 0 means it died alone. `None`
    /// when unknown, e.g. replays ingested before it was tracked.
    pub allies_nearby: Option<u8>,
    /// Players of either team placed near the death; approximate and empty on
    /// replays ingested before it was tracked.
    #[serde(skip_serializing)]
    pub near_players: Vec<u8>,
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
    /// Captured on the other team's side of the map.
    pub stolen: bool,
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
