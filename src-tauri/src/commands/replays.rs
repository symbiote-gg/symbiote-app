use std::path::Path;

use sqlx::SqlitePool;
use tauri::State;

use crate::error::{Error, Result};
use crate::retention::EventRetention;
use crate::types::replay::{ReplayCursor, ReplayDetail, ReplayFilters, ReplayPage};

const MAX_PAGE_SIZE: i64 = 100;

/// Returns a page of the stored replays matching `filters`, or all of them if it's
/// `None`, newest first, along with how many match.
///
/// The page starts right after the replay at `after`, or at the newest replay if it's
/// `None`. `limit` is clamped to `1..=MAX_PAGE_SIZE`.
#[tauri::command]
pub async fn list_replays(
    pool: State<'_, SqlitePool>,
    filters: Option<ReplayFilters>,
    after: Option<ReplayCursor>,
    limit: i64,
) -> Result<ReplayPage> {
    let page = crate::db::replays::list_page(
        &pool,
        &filters.unwrap_or_default(),
        after,
        limit.clamp(1, MAX_PAGE_SIZE),
    )
    .await?;
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
