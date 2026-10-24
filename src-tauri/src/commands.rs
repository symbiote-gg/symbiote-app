use std::path::Path;

use chrono::DateTime;
use sqlx::SqlitePool;
use tauri::ipc::Channel;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::error::{Error, Result};
use crate::ingester::{IngestProgress, IngestSubscribers, Progress};
use crate::types::replay::{ReplayCursor, ReplayDetail, ReplayPage};
use crate::types::settings::{
    DatabaseStats, EventRetention, ReplaysFolder, ReplaysFolderStats, RetentionPreview, Settings,
};
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

/// Returns the full detail of the replay with the given `id`, flagging whether its
/// file is still on disk.
///
/// # Errors
///
/// Fails if no replay has that id or the database query fails.
#[tauri::command]
pub async fn get_replay(
    pool: State<'_, SqlitePool>,
    retention: State<'_, EventRetention>,
    id: i64,
) -> Result<ReplayDetail> {
    let mut detail = crate::db::replays::get_detail(&pool, id, retention.cutoff())
        .await?
        .ok_or(Error::ReplayNotFound(id))?;
    detail.on_disk = Path::new(&detail.replay.path).is_file();
    Ok(detail)
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

#[tauri::command]
pub async fn get_settings(pool: State<'_, SqlitePool>) -> Result<Settings> {
    Ok(crate::db::settings::get(&pool).await?)
}

/// Counts the replays whose events a retention of `years`, or forever if `None`, would
/// purge or restore.
#[tauri::command]
pub async fn preview_event_retention(
    pool: State<'_, SqlitePool>,
    years: Option<u32>,
) -> Result<RetentionPreview> {
    let cutoff = crate::db::replays::events_cutoff(years);
    let expiring = crate::db::replays::list_expiring(&pool, cutoff).await?;
    let purged = crate::db::replays::list_restorable(&pool, cutoff).await?;
    Ok(tauri::async_runtime::spawn_blocking(move || {
        let on_disk = |path: &str| Path::new(path).is_file();
        let restorable = purged.iter().filter(|(_, path)| on_disk(path)).count();
        RetentionPreview {
            expiring: expiring.len(),
            lost: expiring.iter().filter(|path| !on_disk(path)).count(),
            restorable,
            unrestorable: purged.len() - restorable,
        }
    })
    .await?)
}

/// Keeps replays' events for `years`, or forever if `None`, applying it right away: a
/// shorter retention purges the expired events, a longer one re-parses the replays
/// whose events it brings back.
#[tauri::command]
pub async fn set_event_retention(
    app: AppHandle,
    pool: State<'_, SqlitePool>,
    retention: State<'_, EventRetention>,
    years: Option<u32>,
) -> Result<()> {
    if !matches!(years, None | Some(1 | 2 | 5)) {
        return Err(Error::InvalidArgument(format!("{years:?} years")));
    }
    let _applying = retention.lock().await;
    crate::db::settings::set_event_retention(&pool, years).await?;

    let longer = years.unwrap_or(u32::MAX) > retention.years().unwrap_or(u32::MAX);
    retention.set(years);
    if longer {
        crate::ingester::restore_events(&app, retention.cutoff()).await?;
    } else {
        crate::db::replays::purge_expired_events(&pool, retention.cutoff()).await?;
        crate::db::checkpoint(&pool).await?;
    }
    Ok(())
}

/// Returns how many bytes the database takes on disk, and how many games it holds with
/// their events and from the last year.
#[tauri::command]
pub async fn get_database_stats(
    app: AppHandle,
    pool: State<'_, SqlitePool>,
) -> Result<DatabaseStats> {
    let path = crate::db::path(&app)?;
    let wal = path.with_extension("db-wal");
    let last_year = crate::db::replays::events_cutoff(Some(1));
    Ok(DatabaseStats {
        bytes: [path, wal]
            .iter()
            .filter_map(|file| file.metadata().ok())
            .map(|meta| meta.len())
            .sum(),
        games_with_events: crate::db::replays::count_with_events(&*pool).await?,
        games_last_year: crate::db::replays::count_since(&*pool, last_year).await?,
    })
}

/// Returns the folder watched for replays, with how many replays were imported, when the
/// latest was and when the oldest game was played.
#[tauri::command]
pub async fn get_replays_folder(
    pool: State<'_, SqlitePool>,
    folder: State<'_, ReplaysFolder>,
) -> Result<ReplaysFolderStats> {
    let (replays, last_import, oldest_game) = crate::db::replays::import_summary(&*pool).await?;
    Ok(ReplaysFolderStats {
        path: folder.0.as_ref().map(|dir| dir.display().to_string()),
        replays,
        last_import,
        oldest_game,
    })
}

/// Opens the folder watched for replays in the file manager.
#[tauri::command]
pub fn open_replays_folder(app: AppHandle, folder: State<'_, ReplaysFolder>) -> Result<()> {
    let dir = folder.0.as_ref().ok_or(Error::ReplaysFolderNotFound)?;
    app.opener()
        .open_path(dir.display().to_string(), None::<&str>)?;
    Ok(())
}
