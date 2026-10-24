use sqlx::SqlitePool;

/// What is stored for a replay file's content.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HashStatus {
    Unknown,
    /// Stored at the current ingest version, or superseded by a longer replay.
    Current,
    /// Stored at an older ingest version, as the replay with this id.
    Stale(i64),
}

/// Looks up what is stored for `hash`, a replay being stale below ingest `version`.
pub async fn hash_status(pool: &SqlitePool, hash: &str, version: i64) -> sqlx::Result<HashStatus> {
    let stored: Option<(i64, i64)> =
        sqlx::query_as("SELECT id, ingest_version FROM replays WHERE hash = ?")
            .bind(hash)
            .fetch_optional(pool)
            .await?;
    if let Some((id, stored_version)) = stored {
        return Ok(if stored_version < version {
            HashStatus::Stale(id)
        } else {
            HashStatus::Current
        });
    }

    let superseded: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM superseded_replays WHERE hash = ?)")
            .bind(hash)
            .fetch_one(pool)
            .await?;
    Ok(if superseded {
        HashStatus::Current
    } else {
        HashStatus::Unknown
    })
}

/// Lists the paths of the replays stored below ingest `version`, newest first.
pub async fn list_stale_paths(pool: &SqlitePool, version: i64) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar(
        "SELECT path FROM replays WHERE ingest_version < ?
         ORDER BY timestamp DESC, id DESC",
    )
    .bind(version)
    .fetch_all(pool)
    .await
}

pub async fn list_known_paths(pool: &SqlitePool) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar("SELECT path FROM replays UNION ALL SELECT path FROM superseded_replays")
        .fetch_all(pool)
        .await
}

/// Prunes the superseded files whose path isn't in `existing_paths`, i.e. the ones
/// deleted from disk since they were recorded.
pub async fn prune_superseded(pool: &SqlitePool, existing_paths: &[String]) -> sqlx::Result<u64> {
    let paths =
        serde_json::to_string(existing_paths).map_err(|e| sqlx::Error::Encode(Box::new(e)))?;
    sqlx::query(
        "DELETE FROM superseded_replays
         WHERE path NOT IN (SELECT value FROM json_each(?))",
    )
    .bind(paths)
    .execute(pool)
    .await
    .map(|res| res.rows_affected())
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;

    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::test_utils::pool;

    #[tokio::test]
    async fn lists_stale_paths_newest_first() {
        let pool = pool().await;
        for (hash, timestamp, version) in [
            ("old", 100, VERSION - 1),
            ("new", 200, VERSION - 1),
            ("current", 300, VERSION),
        ] {
            let mut game = bundle(hash, 1000);
            game.replay.game_id = hex(hash);
            game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
            game.replay.ingest_version = version;
            insert_bundle(&pool, game).await.unwrap();
        }

        let paths = list_stale_paths(&pool, VERSION).await.unwrap();
        assert_eq!(paths, ["new.StormReplay", "old.StormReplay"]);
    }
}
