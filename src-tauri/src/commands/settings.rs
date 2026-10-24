use sqlx::SqlitePool;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::error::{Error, Result};
use crate::types::settings::{
    DatabaseStats, ReplaysFolder, ReplaysFolderStats, RetentionPreview, Settings,
};

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
    crate::retention::preview(&pool, years).await
}

/// Keeps replays' events for `years`, or forever if `None`, applying it right away.
#[tauri::command]
pub async fn set_event_retention(app: AppHandle, years: Option<u32>) -> Result<()> {
    crate::retention::set(&app, years).await
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
    let last_year = crate::retention::events_cutoff(Some(1));
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
