use sqlx::{QueryBuilder, Sqlite, SqlitePool};

use super::chunk_rows;
use crate::types::award::AwardFact;

pub async fn seed(pool: &SqlitePool, facts: &[AwardFact]) -> sqlx::Result<()> {
    let mut tx = pool.begin().await?;
    for chunk in facts.chunks(chunk_rows(4)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO awards (id, name, description, icon) ")
            .push_values(chunk, |mut row, fact| {
                row.push_bind(&fact.id)
                    .push_bind(&fact.name)
                    .push_bind(&fact.description)
                    .push_bind(&fact.icon);
            })
            .push(
                " ON CONFLICT (id) DO UPDATE SET
                     name = excluded.name, description = excluded.description, icon = excluded.icon",
            )
            .build()
            .persistent(false)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await
}
