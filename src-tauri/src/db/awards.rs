use std::collections::BTreeSet;

use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

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

/// Stores the awards the seed doesn't know without a name, so players can reference them.
pub async fn upsert_unseeded(
    conn: &mut SqliteConnection,
    ids: &BTreeSet<&str>,
) -> sqlx::Result<()> {
    let ids: Vec<&str> = ids.iter().copied().collect();
    for chunk in ids.chunks(chunk_rows(1)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO awards (id) ")
            .push_values(chunk, |mut row, id| {
                row.push_bind(*id);
            })
            .push(" ON CONFLICT (id) DO NOTHING")
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}
