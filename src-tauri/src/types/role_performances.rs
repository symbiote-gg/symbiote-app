use serde::Serialize;

use crate::types::hero::HeroRole;

/// Declared in the order a role's stats are listed on one line, death share last.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RoleStat {
    HeroDamage,
    SiegeDamage,
    Healing,
    /// Damage taken as a percent of the team's.
    DamageTakenShare,
    /// Damage taken in teamfights as a percent of the team's.
    TeamfightDamageTakenShare,
    Xp,
    HardCc,
    Protection,
    /// Takedowns as a percent of the team's kills.
    KillParticipation,
    /// Deaths as a percent of the team's deaths.
    DeathShare,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Verdict {
    Ally,
    Enemy,
    Even,
}

#[derive(Debug, Default, Serialize)]
pub struct Sides<T> {
    pub ally: T,
    pub enemy: T,
}

/// One role either team played, its heroes compared on the stats that matter for it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RolePerformance {
    pub role: HeroRole,
    pub score: RoleScore,
    pub heroes: Sides<Vec<HeroScore>>,
    /// The columns' stats and those a hero is scored on outside the role, in
    /// [`RoleStat`] order.
    pub stats: Vec<StatAverage>,
    pub columns: Vec<StatColumn>,
    /// Support heroes with different kits, so they're listed but not scored.
    pub kits_differ: bool,
}

/// Scores out of 100, a side's being the average of its heroes'.
#[derive(Debug, Serialize)]
pub struct RoleScore {
    pub ally: Option<u8>,
    pub enemy: Option<u8>,
    pub gap: Option<i64>,
    pub verdict: Option<Verdict>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroScore {
    pub player_id: i64,
    pub score: Option<u8>,
    pub parts: Vec<ScorePart>,
    /// Stats the hero is weighted on that didn't count toward the score.
    pub unscored: Vec<UnscoredStat>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UnscoredReason {
    NoData,
    /// No hero in the role had any, so there's no best to measure against.
    NoneInRole,
    /// The hero's team had no kills to take part in.
    NoTeamKills,
}

#[derive(Debug, Serialize)]
pub struct UnscoredStat {
    pub stat: RoleStat,
    pub reason: UnscoredReason,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScorePart {
    pub stat: RoleStat,
    pub value: i64,
    /// The rate against the best of the role's heroes, from 0 to 1.
    pub share: f64,
    /// From 1 to 3.
    pub weight: u8,
    pub points: u8,
}

/// Per hero averages, `None` when the side has no hero or none has the stat.
#[derive(Debug, Serialize)]
pub struct StatAverage {
    pub stat: RoleStat,
    pub ally: Option<f64>,
    pub enemy: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct StatColumn {
    pub stat: RoleStat,
    /// The heaviest weight any of the role's heroes gives the stat.
    pub weight: u8,
}
