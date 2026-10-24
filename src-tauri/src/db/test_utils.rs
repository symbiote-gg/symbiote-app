use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

/// An empty in-memory database with the migrations run.
pub async fn pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}
