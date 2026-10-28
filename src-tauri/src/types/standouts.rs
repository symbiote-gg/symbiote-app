//! What the standouts command sends the frontend: ids, enum keys and numbers only.
//! The copy lives in the frontend's i18n catalog, picked by these keys.

use std::collections::BTreeMap;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StandoutId {
    AloneDeaths,
    PickDeaths,
    FirstDead,
    StayedInLost,
    DeathsPunished,
    TimeDead,
    FightRecord,
    MissedFights,
    AllFights,
    StolenCamps,
    UnansweredEngages,
    LanePressure,
}

/// Colours the key figure: a cost, worth a look, or something done right.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Tone {
    Bad,
    Watch,
    Good,
}

/// The key figure as a number; the frontend formats it by `unit`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Figure {
    pub value: f64,
    /// Renders the figure as "value of total" when set.
    pub total: Option<i64>,
    pub unit: FigureUnit,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FigureUnit {
    Count,
    /// Rendered as whole seconds, e.g. "12s".
    Seconds,
    /// Rendered as minutes and seconds, e.g. "5:30".
    Duration,
}

/// Which sentence fits the hero, e.g. a tank's fight record counts only the fights
/// that opened with it there. `None` is the default sentence.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Variant {
    Tank,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Standout {
    pub id: StandoutId,
    pub tone: Tone,
    pub figure: Figure,
    /// Fills the sentence and the figure's unit line.
    pub params: BTreeMap<String, i64>,
    pub variant: Option<Variant>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StandoutsResult {
    /// Most standouts shown, best first.
    pub items: Vec<Standout>,
    /// The replay was played too long ago to keep its events.
    pub events_expired: bool,
}

impl StandoutsResult {
    pub fn expired() -> Self {
        Self {
            events_expired: true,
            ..Self::default()
        }
    }
}
