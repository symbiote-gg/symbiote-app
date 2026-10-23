use serde::Serialize;
use sha2::{Digest, Sha256};
use sqlx::sqlite::{
    SqliteAutoVacuum, SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous,
};
use sqlx::SqlitePool;
use tauri::Manager;

use crate::error::Result;
use crate::types::award::AwardFact;
use crate::types::hero::HeroFact;
use crate::types::map::MapFact;
use crate::types::talent::TalentFact;

pub mod awards;
pub mod event_kinds;
pub mod heroes;
pub mod maps;
pub mod parties;
pub mod players;
pub mod replays;
pub mod stats;
pub mod talents;

const DB_FILE: &str = "symbiote.db";

/// SQLite's default limit on bound parameters per statement. Multi-row
/// inserts are chunked to stay under it.
const MAX_BIND_PARAMS: usize = 32766;

/// Returns how many rows with `columns` columns fit in a multi-row insert
/// without exceeding [`MAX_BIND_PARAMS`].
const fn chunk_rows(columns: usize) -> usize {
    MAX_BIND_PARAMS / columns
}

/// Opens the database in the app data folder, creating it if needed, then runs the
/// migrations and seeds the bundled hero, talent, award and map facts that changed.
pub async fn init(app: &tauri::AppHandle) -> Result<SqlitePool> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;

    let opts = SqliteConnectOptions::new()
        .filename(dir.join(DB_FILE))
        .create_if_missing(true)
        .foreign_keys(true)
        .auto_vacuum(SqliteAutoVacuum::Full)
        .journal_mode(SqliteJournalMode::Wal)
        // Safe with WAL: a power loss can only drop the last commits, never corrupt the file.
        .synchronous(SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new().connect_with(opts).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;

    let heroes = HeroFact::bundled()?;
    if let Some(seed) = Seed::pending(&pool, "heroes", &heroes).await? {
        heroes::seed(&pool, &heroes).await?;
        seed.done(&pool).await?;
    }
    let talents = TalentFact::bundled()?;
    if let Some(seed) = Seed::pending(&pool, "talents", &talents).await? {
        talents::seed(&pool, &talents).await?;
        seed.done(&pool).await?;
    }
    let awards = AwardFact::bundled()?;
    if let Some(seed) = Seed::pending(&pool, "awards", &awards).await? {
        awards::seed(&pool, &awards).await?;
        seed.done(&pool).await?;
    }
    let maps = MapFact::bundled()?;
    if let Some(seed) = Seed::pending(&pool, "maps", &maps).await? {
        maps::seed(&pool, &maps).await?;
        seed.done(&pool).await?;
    }
    Ok(pool)
}

/// A table's bundled facts that differ from the ones it was last seeded with.
///
/// The facts are hashed as mapped, not as bundled, so a change in the mapping reseeds
/// too.
struct Seed {
    source: &'static str,
    hash: String,
}

impl Seed {
    /// Returns the seed to run, or `None` if `source` was last seeded with `facts`.
    async fn pending<T: Serialize>(
        pool: &SqlitePool,
        source: &'static str,
        facts: &[T],
    ) -> Result<Option<Self>> {
        let hash = format!("{:x}", Sha256::digest(serde_json::to_vec(facts)?));
        let stored: Option<String> = sqlx::query_scalar("SELECT hash FROM seeds WHERE source = ?")
            .bind(source)
            .fetch_optional(pool)
            .await?;
        Ok((stored.as_deref() != Some(&hash)).then_some(Self { source, hash }))
    }

    /// Records the seed as run, only once it succeeded so a failed one is retried.
    async fn done(self, pool: &SqlitePool) -> sqlx::Result<()> {
        sqlx::query(
            "INSERT INTO seeds (source, hash) VALUES (?, ?)
             ON CONFLICT (source) DO UPDATE SET hash = excluded.hash",
        )
        .bind(self.source)
        .bind(self.hash)
        .execute(pool)
        .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use sqlx::sqlite::SqlitePoolOptions;

    use super::*;

    async fn pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    fn talent(name: &str) -> TalentFact {
        TalentFact {
            slug: "abathur_mastery_pressurized_glands".to_owned(),
            hero_slug: "Abathur".to_owned(),
            tier: 1,
            name: name.to_owned(),
            description: None,
            icon: None,
        }
    }

    #[tokio::test]
    async fn seeds_only_changed_facts() {
        let pool = pool().await;
        let facts = [talent("Pressurized Glands")];

        let seed = Seed::pending(&pool, "talents", &facts).await.unwrap();
        seed.expect("never seeded").done(&pool).await.unwrap();
        assert!(Seed::pending(&pool, "talents", &facts)
            .await
            .unwrap()
            .is_none());
        assert!(Seed::pending(&pool, "awards", &facts)
            .await
            .unwrap()
            .is_some());

        let renamed = [talent("Pressurized Glands (Reworked)")];
        assert!(Seed::pending(&pool, "talents", &renamed)
            .await
            .unwrap()
            .is_some());
    }
}
