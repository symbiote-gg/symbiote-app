use sqlx::{QueryBuilder, Sqlite, SqlitePool};

use super::chunk_rows;
use crate::types::map::MapFact;

pub async fn seed(pool: &SqlitePool, facts: &[MapFact]) -> sqlx::Result<()> {
    let mut tx = pool.begin().await?;
    for chunk in facts.chunks(chunk_rows(3)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO maps (id, name, loading_screen) ")
            .push_values(chunk, |mut row, fact| {
                row.push_bind(&fact.id)
                    .push_bind(&fact.name)
                    .push_bind(&fact.loading_screen);
            })
            .push(
                " ON CONFLICT (id) DO UPDATE SET
                     name = excluded.name, loading_screen = excluded.loading_screen",
            )
            .build()
            .persistent(false)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await
}
