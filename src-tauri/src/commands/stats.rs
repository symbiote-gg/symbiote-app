use sqlx::SqlitePool;
use tauri::State;

use crate::error::Result;
use crate::types::replay::Mode;
use crate::types::settings::SessionStart;
use crate::types::stats::{
    MapStat, MostPlayedHeroes, ProfileCareer, ProfileScore, ScoreScope, SessionRecord,
};

/// Sums up the owner's career across every hero.
#[tauri::command]
pub async fn get_profile_career(pool: State<'_, SqlitePool>) -> Result<ProfileCareer> {
    Ok(crate::db::stats::profile_career(&pool).await?)
}

/// Scores the owner's latest games in the scope's modes against the other players
/// in them.
#[tauri::command]
pub async fn get_profile_score(
    pool: State<'_, SqlitePool>,
    session: State<'_, SessionStart>,
    scope: ScoreScope,
) -> Result<ProfileScore> {
    Ok(crate::db::stats::profile_score(&pool, scope, session.0).await?)
}

/// Sums up the owner's games ended since the app was opened.
#[tauri::command]
pub async fn get_session_record(
    pool: State<'_, SqlitePool>,
    session: State<'_, SessionStart>,
) -> Result<SessionRecord> {
    Ok(crate::db::stats::session_record(&pool, session.0).await?)
}

const MAX_MOST_PLAYED_HEROES: i64 = 200;

/// Returns the `limit` heroes the owner played the most, clamped to `1..=MAX_MOST_PLAYED_HEROES`.
#[tauri::command]
pub async fn get_most_played_heroes(
    pool: State<'_, SqlitePool>,
    limit: i64,
) -> Result<MostPlayedHeroes> {
    Ok(crate::db::stats::most_played_heroes(&pool, limit.clamp(1, MAX_MOST_PLAYED_HEROES)).await?)
}

/// Returns the modes the owner has played.
#[tauri::command]
pub async fn get_played_modes(pool: State<'_, SqlitePool>) -> Result<Vec<Mode>> {
    Ok(crate::db::stats::played_modes(&pool).await?)
}

/// Returns the maps the owner has played on, by name.
#[tauri::command]
pub async fn get_played_maps(pool: State<'_, SqlitePool>) -> Result<Vec<MapStat>> {
    Ok(crate::db::stats::played_maps(&pool).await?)
}
