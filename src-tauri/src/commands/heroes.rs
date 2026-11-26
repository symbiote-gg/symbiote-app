use sqlx::SqlitePool;
use tauri::State;

use crate::error::Result;
use crate::types::hero_stats::{BuildKey, HeroDetail, HeroList, RandomBuild};
use crate::types::replay::ReplayFilters;

/// Returns the heroes the owner played in the games matching `filters`, with their stats.
#[tauri::command]
pub async fn get_hero_list(
    pool: State<'_, SqlitePool>,
    filters: Option<ReplayFilters>,
) -> Result<HeroList> {
    Ok(crate::db::hero_stats::hero_list(&pool, &filters.unwrap_or_default()).await?)
}

/// Returns the owner's stats on a hero, or `None` if the hero doesn't exist.
#[tauri::command]
pub async fn get_hero_detail(
    pool: State<'_, SqlitePool>,
    hero_id: i64,
) -> Result<Option<HeroDetail>> {
    Ok(crate::db::hero_stats::hero_detail(&pool, hero_id).await?)
}

/// Returns a random full build another player won with on a hero, other than `exclude`
/// unless it's the only one, or `None` if there's none.
#[tauri::command]
pub async fn get_random_build(
    pool: State<'_, SqlitePool>,
    hero_id: i64,
    exclude: Option<BuildKey>,
) -> Result<Option<RandomBuild>> {
    Ok(crate::db::hero_stats::random_build(&pool, hero_id, exclude).await?)
}
