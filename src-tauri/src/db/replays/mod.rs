//! Stored replays: ingesting them, listing and reading them back, and expiring their
//! events.

mod detail;
mod files;
mod insert;
mod list;
mod retention;
#[cfg(test)]
mod test_utils;

use chrono::{DateTime, Utc};
use sqlx::{SqliteExecutor, SqlitePool};

pub use detail::get_detail;
pub use files::{
    get_path, hash_status, list_known_paths, list_stale_paths, prune_superseded, HashStatus,
};
pub use insert::{insert_bundles, InsertOutcome};
pub use list::{get_list_row, list_page};
pub use retention::{list_expiring, list_restorable, mark_stale, purge_expired_events};

pub async fn mark_seen(pool: &SqlitePool, id: i64) -> sqlx::Result<()> {
    sqlx::query("UPDATE replays SET is_new = 0 WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn count(executor: impl SqliteExecutor<'_>) -> sqlx::Result<i64> {
    sqlx::query_scalar("SELECT COUNT(*) FROM replays")
        .fetch_one(executor)
        .await
}

/// Returns how many replays are stored, when the latest was ingested and when the
/// oldest was played.
pub async fn import_summary(
    executor: impl SqliteExecutor<'_>,
) -> sqlx::Result<(i64, Option<DateTime<Utc>>, Option<DateTime<Utc>>)> {
    sqlx::query_as("SELECT COUNT(*), MAX(ingest_date), MIN(timestamp) FROM replays")
        .fetch_one(executor)
        .await
}

pub async fn count_since(executor: impl SqliteExecutor<'_>, since: i64) -> sqlx::Result<i64> {
    sqlx::query_scalar("SELECT COUNT(*) FROM replays WHERE timestamp >= ?")
        .bind(since)
        .fetch_one(executor)
        .await
}

pub async fn count_with_events(executor: impl SqliteExecutor<'_>) -> sqlx::Result<i64> {
    sqlx::query_scalar(
        "SELECT COUNT(*) FROM replays r
         WHERE EXISTS (SELECT 1 FROM events e WHERE e.replay_id = r.id)",
    )
    .fetch_one(executor)
    .await
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;

    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::test_utils::pool;

    #[tokio::test]
    async fn summarizes_the_imported_replays() {
        let pool = pool().await;
        assert_eq!(import_summary(&pool).await.unwrap(), (0, None, None));

        insert_game(&pool, "new", 200).await;
        insert_game(&pool, "old", 100).await;
        let (replays, last_import, oldest_game) = import_summary(&pool).await.unwrap();
        assert_eq!(replays, 2);
        assert!(last_import.is_some());
        assert_eq!(oldest_game, DateTime::from_timestamp(100, 0));
    }
}
