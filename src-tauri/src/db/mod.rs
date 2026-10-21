use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use tauri::Manager;

use crate::error::Result;
use crate::types::award::AwardFact;
use crate::types::hero::HeroFact;
use crate::types::map::MapFact;
use crate::types::talent::TalentFact;

pub mod awards;
pub mod heroes;
pub mod maps;
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
/// migrations and seeds the bundled hero, talent, award and map facts.
pub async fn init(app: &tauri::AppHandle) -> Result<SqlitePool> {
    let dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&dir)?;

    let opts = SqliteConnectOptions::new()
        .filename(dir.join(DB_FILE))
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal)
        // Safe with WAL: a power loss can only drop the last commits, never corrupt the file.
        .synchronous(SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new().connect_with(opts).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;

    heroes::seed(&pool, &HeroFact::bundled()?).await?;
    talents::seed(&pool, &TalentFact::bundled()?).await?;
    awards::seed(&pool, &AwardFact::bundled()?).await?;
    maps::seed(&pool, &MapFact::bundled()?).await?;
    Ok(pool)
}
