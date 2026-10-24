use chrono::DateTime;
use sqlx::SqlitePool;
use tauri::State;

use crate::error::{Error, Result};
use crate::types::stats::{MostPlayedHeroes, ProfileSummary};

/// Sums up the owner's results; `since` is a unix timestamp in seconds from which
/// games count as new.
#[tauri::command]
pub async fn get_profile_summary(
    pool: State<'_, SqlitePool>,
    since: i64,
) -> Result<ProfileSummary> {
    let since = DateTime::from_timestamp(since, 0)
        .ok_or_else(|| Error::InvalidArgument(format!("since {since}")))?;
    Ok(crate::db::stats::profile_summary(&pool, since).await?)
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
