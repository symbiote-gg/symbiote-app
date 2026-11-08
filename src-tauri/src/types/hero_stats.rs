use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

use super::hero::HeroRole;
use super::replay::AwardInfo;

/// A hero the owner played, with their totals and per-game averages on it.
#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroSummary {
    pub hero_id: i64,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
    pub accent: Option<String>,
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
    pub takedowns: i64,
    pub deaths: i64,
    pub avg_hero_damage: Option<f64>,
    pub avg_healing: Option<f64>,
    pub avg_damage_taken: Option<f64>,
    pub last_played: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroList {
    /// How many heroes the game has, played or not.
    pub total: i64,
    pub heroes: Vec<HeroSummary>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroInfo {
    pub hero_id: i64,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
    pub banner: Option<String>,
    pub accent: Option<String>,
}

/// The owner's results on a hero, with what they average per game on it.
#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroTotals {
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
    pub takedowns: i64,
    pub deaths: i64,
    pub avg_kills: Option<f64>,
    pub avg_deaths: Option<f64>,
    pub avg_assists: Option<f64>,
    pub avg_hero_damage: Option<f64>,
    pub avg_siege_damage: Option<f64>,
    pub avg_healing: Option<f64>,
    pub avg_self_healing: Option<f64>,
    pub avg_damage_taken: Option<f64>,
    pub avg_xp: Option<f64>,
    pub avg_time_dead_secs: Option<f64>,
    /// The owner's average share of their team's kills, from 0 to 1.
    pub kill_participation: Option<f64>,
    /// The owner's average share of their team's total, from 0 to 1, for each stat.
    pub share_hero_damage: Option<f64>,
    pub share_siege_damage: Option<f64>,
    pub share_damage_taken: Option<f64>,
    pub share_healing: Option<f64>,
    pub share_xp: Option<f64>,
    pub avg_duration: Option<f64>,
    /// Seconds across every game.
    pub total_duration: i64,
    pub last_played: Option<DateTime<Utc>>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AwardCount {
    #[sqlx(flatten)]
    #[serde(flatten)]
    pub award: AwardInfo,
    pub count: i64,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapRecord {
    pub id: String,
    pub name: String,
    pub loading_screen: Option<String>,
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
}

/// A talent of the hero, with how often the owner picked it at `tier`. A talent picked
/// at a tier it has since moved from shows up at that old tier too.
#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TalentRecord {
    pub tier: i64,
    pub talent_id: i64,
    pub slug: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub picks: i64,
    pub wins: i64,
    pub losses: i64,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendPoint {
    /// The day, as `YYYY-MM-DD` in local time.
    pub day: String,
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
    /// Win rate over all decided career games as of this day, or `None` on a day
    /// without a decided game.
    pub rate: Option<f64>,
}

/// The owner's game on a hero with the best value of a stat.
#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroBest {
    pub replay_id: i64,
    pub value: f64,
    /// The map's name.
    pub map: String,
    pub loading_screen: Option<String>,
    pub timestamp: DateTime<Utc>,
}

/// One of the owner's games on a hero, with its line.
#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroGame {
    pub replay_id: i64,
    /// The map's name.
    pub map: String,
    pub loading_screen: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub duration: i64,
    pub owner_win: Option<bool>,
    pub kills: i64,
    pub deaths: i64,
    pub assists: i64,
    pub hero_damage: i64,
}

/// The owner's results on a hero in games lasting from `from` up to `to` seconds.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLength {
    pub from: i64,
    /// `None` for the last length, which has no upper bound.
    pub to: Option<i64>,
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
}

/// The hero most often on the owner's team in their games on a hero.
#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AllyHero {
    pub hero_id: i64,
    pub name: String,
    pub games: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WinStreak {
    pub games: i64,
    /// When its last game was played.
    pub ended: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroBests {
    pub hero_damage: Option<HeroBest>,
    pub siege_damage: Option<HeroBest>,
    pub takedowns: Option<HeroBest>,
    /// The shortest win, its length in seconds as the value.
    pub fastest_win: Option<HeroBest>,
    pub win_streak: Option<WinStreak>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroDetail {
    #[serde(flatten)]
    pub hero: HeroInfo,
    #[serde(flatten)]
    pub totals: HeroTotals,
    pub awards: Vec<AwardCount>,
    pub maps: Vec<MapRecord>,
    pub talents: Vec<TalentRecord>,
    /// The owner's days with games on the hero, oldest first, over the 90 days ending
    /// on the day of the last game. Days without games are left out.
    pub trend: Vec<TrendPoint>,
    pub bests: HeroBests,
    pub best_game: Option<HeroGame>,
    pub last_game: Option<HeroGame>,
    /// Shortest first, every length whether played or not.
    pub lengths: Vec<GameLength>,
    pub ally: Option<AllyHero>,
}
