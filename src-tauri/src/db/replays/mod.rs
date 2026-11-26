//! Stored replays: ingesting them, listing and reading them back, and expiring their
//! events.

mod detail;
mod files;
mod insert;
mod list;
mod retention;
mod standouts;
#[cfg(test)]
pub(crate) mod test_utils;

use chrono::{DateTime, Utc};
use sqlx::{SqliteExecutor, SqlitePool};

pub use detail::get_detail;
pub use files::{
    get_path, hash_status, list_known_paths, list_stale_paths, prune_superseded, HashStatus,
};
pub use insert::{insert_bundles, InsertOutcome};
pub use list::{get_list_row, list_page};
pub use retention::{list_expiring, list_restorable, mark_stale, purge_expired_events};
pub use standouts::{get_standouts_input, StandoutsLoad};

pub async fn mark_seen(pool: &SqlitePool, id: i64) -> sqlx::Result<()> {
    sqlx::query("UPDATE replays SET is_new = 0 WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

/// Whether any stored replay is still waiting to be viewed.
pub async fn has_new(executor: impl SqliteExecutor<'_>) -> sqlx::Result<bool> {
    sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM replays WHERE is_new = 1)")
        .fetch_one(executor)
        .await
}

/// Returns the other accounts' replays of replay `id`'s game.
pub async fn sibling_ids(executor: impl SqliteExecutor<'_>, id: i64) -> sqlx::Result<Vec<i64>> {
    sqlx::query_scalar(
        "SELECT s.id FROM replays r
         JOIN replays s ON s.game_id = r.game_id AND s.id <> r.id
         WHERE r.id = ?",
    )
    .bind(id)
    .fetch_all(executor)
    .await
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
    sqlx::query_as("SELECT COUNT(*), MAX(ingest_date), MIN(timestamp) FROM replays_view")
        .fetch_one(executor)
        .await
}

pub async fn count_since(executor: impl SqliteExecutor<'_>, since: i64) -> sqlx::Result<i64> {
    sqlx::query_scalar("SELECT COUNT(*) FROM replays_view WHERE timestamp >= ?")
        .bind(since)
        .fetch_one(executor)
        .await
}

pub async fn count_with_events(executor: impl SqliteExecutor<'_>) -> sqlx::Result<i64> {
    sqlx::query_scalar(
        "SELECT COUNT(*) FROM replays r
         WHERE EXISTS (SELECT 1 FROM events e WHERE e.game_id = r.game_id)",
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

    #[tokio::test]
    async fn tells_when_a_replay_waits_to_be_viewed() {
        let pool = pool().await;
        assert!(!has_new(&pool).await.unwrap());

        insert_bundle(&pool, bundle("seen", 1000)).await.unwrap();
        assert!(!has_new(&pool).await.unwrap());

        let mut new = bundle("new", 1000);
        new.replay.game_key = hex("other game");
        new.replay.is_new = true;
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, new).await.unwrap() else {
            panic!("the new replay wasn't inserted");
        };
        assert!(has_new(&pool).await.unwrap());

        mark_seen(&pool, id).await.unwrap();
        assert!(!has_new(&pool).await.unwrap());
    }
}
