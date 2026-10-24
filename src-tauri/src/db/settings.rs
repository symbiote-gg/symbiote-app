use sqlx::SqlitePool;

use crate::types::settings::Settings;

pub async fn get(pool: &SqlitePool) -> sqlx::Result<Settings> {
    sqlx::query_as("SELECT event_retention_years FROM settings WHERE id = 1")
        .fetch_one(pool)
        .await
}

pub async fn set_event_retention(pool: &SqlitePool, years: Option<u32>) -> sqlx::Result<()> {
    sqlx::query("UPDATE settings SET event_retention_years = ? WHERE id = 1")
        .bind(years)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::test_utils::pool;

    #[tokio::test]
    async fn keeps_events_five_years_until_changed() {
        let pool = pool().await;
        assert_eq!(get(&pool).await.unwrap().event_retention_years, Some(5));

        set_event_retention(&pool, Some(2)).await.unwrap();
        assert_eq!(get(&pool).await.unwrap().event_retention_years, Some(2));

        set_event_retention(&pool, None).await.unwrap();
        assert_eq!(get(&pool).await.unwrap().event_retention_years, None);
    }
}
