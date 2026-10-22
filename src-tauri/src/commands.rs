use chrono::DateTime;
use sqlx::SqlitePool;
use tauri::ipc::Channel;
use tauri::State;

use crate::error::{Error, Result};
use crate::ingester::{IngestProgress, IngestSubscribers, Progress};
use crate::types::replay::{ReplayCursor, ReplayDetail, ReplayPage};
use crate::types::stats::{MostPlayedHeroes, ProfileSummary};

const MAX_PAGE_SIZE: i64 = 100;

/// Returns a page of stored replays, newest first, along with the total count.
///
/// The page starts right after the replay at `after`, or at the newest replay if it's
/// `None`. `limit` is clamped to `1..=MAX_PAGE_SIZE`.
#[tauri::command]
pub async fn list_replays(
    pool: State<'_, SqlitePool>,
    after: Option<ReplayCursor>,
    limit: i64,
) -> Result<ReplayPage> {
    let page = crate::db::replays::list_page(&pool, after, limit.clamp(1, MAX_PAGE_SIZE)).await?;
    Ok(page)
}

/// Returns the full detail of the replay with the given `id`.
///
/// # Errors
///
/// Fails if no replay has that id or the database query fails.
#[tauri::command]
pub async fn get_replay(pool: State<'_, SqlitePool>, id: i64) -> Result<ReplayDetail> {
    crate::db::replays::get_detail(&pool, id)
        .await?
        .ok_or(Error::ReplayNotFound(id))
}

#[tauri::command]
pub async fn mark_replay_as_seen(pool: State<'_, SqlitePool>, id: i64) -> Result<()> {
    Ok(crate::db::replays::mark_seen(&pool, id).await?)
}

#[tauri::command]
pub async fn count_replays(pool: State<'_, SqlitePool>) -> Result<i64> {
    Ok(crate::db::replays::count(&*pool).await?)
}

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

/// Streams each replay stored by the ingester to `channel`, until
/// [`unsubscribe_ingest`] is called with the returned id.
#[tauri::command]
pub fn subscribe_ingest(subscribers: State<'_, IngestSubscribers>, channel: Channel) -> u32 {
    subscribers.subscribe(channel)
}

#[tauri::command]
pub fn unsubscribe_ingest(subscribers: State<'_, IngestSubscribers>, id: u32) {
    subscribers.unsubscribe(id);
}

/// Returns how far the scan and re-parse backlogs are, to show before the first
/// `ingest-progress` event arrives.
#[tauri::command]
pub fn get_ingest_progress(progress: State<'_, Progress>) -> IngestProgress {
    progress.snapshot()
}
