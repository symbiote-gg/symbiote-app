use std::path::Path;

use sqlx::SqlitePool;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::db::replays::StandoutsLoad;
use crate::error::{Error, Result};
use crate::retention::EventRetention;
use crate::types::replay::{ReplayCursor, ReplayDetail, ReplayFilters, ReplayPage, ReplaySort};
use crate::types::standouts::StandoutsResult;

const MAX_PAGE_SIZE: i64 = 100;
/// Most games a hero baseline is read from.
const MAX_BASELINE_GAMES: i64 = 20;

/// Returns a page of the stored replays matching `filters`, or all of them if it's
/// `None`, in `sort` order, newest first if it's `None`, along with how many match.
///
/// The page starts right after the replay at `after`, or at the first one if it's
/// `None`. `limit` is clamped to `1..=MAX_PAGE_SIZE`.
#[tauri::command]
pub async fn list_replays(
    pool: State<'_, SqlitePool>,
    filters: Option<ReplayFilters>,
    sort: Option<ReplaySort>,
    after: Option<ReplayCursor>,
    limit: i64,
) -> Result<ReplayPage> {
    let page = crate::db::replays::list_page(
        &pool,
        &filters.unwrap_or_default(),
        sort.unwrap_or_default(),
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

/// Returns the coaching standouts of the replay `id`, judged against the owner's
/// last games on the same hero. Only ids, variant keys and numbers: the copy lives
/// in the frontend's i18n catalog.
///
/// # Errors
///
/// Fails if no replay has that id or the database query fails.
#[tauri::command]
pub async fn get_standouts(
    pool: State<'_, SqlitePool>,
    retention: State<'_, EventRetention>,
    id: i64,
) -> Result<StandoutsResult> {
    let load =
        crate::db::replays::get_standouts_input(&pool, id, retention.cutoff(), MAX_BASELINE_GAMES)
            .await?
            .ok_or(Error::ReplayNotFound(id))?;
    Ok(match load {
        StandoutsLoad::Expired => StandoutsResult::expired(),
        StandoutsLoad::Ready(input) => crate::standouts::compute(&input),
    })
}

/// Opens the file of the replay with the given `id` in its default app, i.e. the game.
///
/// Looked up by id rather than taking a path, so the frontend can't open arbitrary files.
#[tauri::command]
pub async fn watch_replay(app: AppHandle, pool: State<'_, SqlitePool>, id: i64) -> Result<()> {
    let path = crate::db::replays::get_path(&pool, id)
        .await?
        .ok_or(Error::ReplayNotFound(id))?;
    app.opener().open_path(path, None::<&str>)?;
    Ok(())
}

#[tauri::command]
pub async fn mark_replay_as_seen(pool: State<'_, SqlitePool>, id: i64) -> Result<()> {
    Ok(crate::db::replays::mark_seen(&pool, id).await?)
}

#[tauri::command]
pub async fn count_replays(pool: State<'_, SqlitePool>) -> Result<i64> {
    Ok(crate::db::replays::count(&*pool).await?)
}
