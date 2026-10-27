use sqlx::SqlitePool;

/// Most replays whose events are deleted per statement, so a first purge of a large
/// database doesn't hold the write lock against the ingester for long.
const PURGE_CHUNK: i64 = 100;

/// Lists the path of the replays played before `cutoff` whose events aren't purged yet.
pub async fn list_expiring(pool: &SqlitePool, cutoff: i64) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar(
        "SELECT r.path FROM replays r
         WHERE r.timestamp < ? AND EXISTS (SELECT 1 FROM events e WHERE e.replay_id = r.id)",
    )
    .bind(cutoff)
    .fetch_all(pool)
    .await
}

/// Lists the id and path of the replays played since `cutoff` whose events were purged,
/// newest first.
pub async fn list_restorable(pool: &SqlitePool, cutoff: i64) -> sqlx::Result<Vec<(i64, String)>> {
    sqlx::query_as(
        "SELECT r.id, r.path FROM replays r
         WHERE r.timestamp >= ?
             AND NOT EXISTS (SELECT 1 FROM events e WHERE e.replay_id = r.id)
         ORDER BY r.timestamp DESC, r.id DESC",
    )
    .bind(cutoff)
    .fetch_all(pool)
    .await
}

/// Flags the replays `ids` for a re-parse, e.g. to read their purged events back.
pub async fn mark_stale(pool: &SqlitePool, ids: &[i64]) -> sqlx::Result<()> {
    let ids = serde_json::to_string(ids).map_err(|e| sqlx::Error::Encode(Box::new(e)))?;
    sqlx::query(
        "UPDATE replays SET reparse = 1
         WHERE id IN (SELECT value FROM json_each(?))",
    )
    .bind(ids)
    .execute(pool)
    .await?;
    Ok(())
}

/// Deletes the events of the replays played before `cutoff`, keeping the replays
/// themselves. Returns how many events were deleted.
pub async fn purge_expired_events(pool: &SqlitePool, cutoff: i64) -> sqlx::Result<u64> {
    let mut purged = 0;
    loop {
        let deleted = sqlx::query(
            "DELETE FROM events WHERE replay_id IN (
                 SELECT r.id FROM replays r
                 WHERE r.timestamp < ?
                     AND EXISTS (SELECT 1 FROM events e WHERE e.replay_id = r.id)
                 LIMIT ?)",
        )
        .bind(cutoff)
        .bind(PURGE_CHUNK)
        .execute(pool)
        .await?
        .rows_affected();
        if deleted == 0 {
            return Ok(purged);
        }
        purged += deleted;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::replays::{
        count, count_since, count_with_events, hash_status, list_stale_paths, HashStatus,
        InsertOutcome,
    };
    use crate::db::test_utils::pool;

    #[tokio::test]
    async fn purges_events_of_expired_replays_only() {
        let pool = pool().await;
        let InsertOutcome::Inserted(old) = insert_bundle(&pool, game_with_events("old", 100))
            .await
            .unwrap()
        else {
            panic!("the replay should be inserted");
        };
        let InsertOutcome::Inserted(new) = insert_bundle(&pool, game_with_events("new", 300))
            .await
            .unwrap()
        else {
            panic!("the replay should be inserted");
        };

        assert_eq!(purge_expired_events(&pool, 200).await.unwrap(), 1);
        assert_eq!(event_count(&pool, old).await, 0);
        assert_eq!(event_count(&pool, new).await, 1);
        assert_eq!(count(&pool).await.unwrap(), 2);
        assert_eq!(purge_expired_events(&pool, 200).await.unwrap(), 0);
    }

    #[tokio::test]
    async fn lists_purged_replays_inside_the_cutoff_to_restore() {
        let pool = pool().await;
        for (game, timestamp) in [("old", 100), ("purged", 300), ("kept", 400)] {
            insert_bundle(&pool, game_with_events(game, timestamp))
                .await
                .unwrap();
        }
        purge_expired_events(&pool, 350).await.unwrap();
        assert!(list_expiring(&pool, 350).await.unwrap().is_empty());
        assert_eq!(
            list_expiring(&pool, 500).await.unwrap(),
            ["kept.StormReplay"]
        );
        assert_eq!(count_since(&pool, 200).await.unwrap(), 2);
        assert_eq!(count_with_events(&pool).await.unwrap(), 1);

        let restorable = list_restorable(&pool, 200).await.unwrap();
        let paths: Vec<&str> = restorable.iter().map(|(_, path)| path.as_str()).collect();
        assert_eq!(paths, ["purged.StormReplay"]);

        mark_stale(&pool, &[restorable[0].0]).await.unwrap();
        assert_eq!(
            status(&pool, "purged").await,
            HashStatus::Stale(restorable[0].0)
        );
        assert_eq!(status(&pool, "kept").await, HashStatus::Current);
    }

    #[tokio::test]
    async fn marks_purged_replays_stale_at_the_real_ingest_version() {
        let version = crate::ingester::INGEST_VERSION;
        let pool = pool().await;
        let mut game = game_with_events("purged", 100);
        game.replay.ingest_version = version;
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, game).await.unwrap() else {
            panic!("the replay should be inserted");
        };
        purge_expired_events(&pool, 200).await.unwrap();
        assert!(list_stale_paths(&pool, version).await.unwrap().is_empty());

        mark_stale(&pool, &[id]).await.unwrap();
        assert_eq!(
            hash_status(&pool, &hex("purged"), version).await.unwrap(),
            HashStatus::Stale(id)
        );
        assert_eq!(
            list_stale_paths(&pool, version).await.unwrap(),
            ["purged.StormReplay"]
        );
    }
}
