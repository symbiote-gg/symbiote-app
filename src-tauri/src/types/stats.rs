use serde::Serialize;
use sqlx::FromRow;

use super::hero::HeroRole;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSummary {
    pub games: i64,
    pub wins: i64,
    pub losses: i64,
    pub mvps: i64,
    pub top_damage_games: i64,
    pub main_role: Option<HeroRole>,
    pub recent: Vec<Option<bool>>,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeroStat {
    pub hero_id: i64,
    pub name: String,
    pub role: Option<HeroRole>,
    pub portrait: Option<String>,
    pub games: i64,
    pub wins: i64,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MapStat {
    pub id: String,
    pub name: String,
    pub loading_screen: Option<String>,
    pub games: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MostPlayedHeroes {
    pub played: i64,
    pub total: i64,
    pub heroes: Vec<HeroStat>,
}
