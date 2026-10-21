use std::collections::HashMap;

use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use super::chunk_rows;
use crate::types::hero::{Hero, HeroFact};

/// Maps hero names to ids for the heroes seeded from the bundled facts.
pub async fn seeded_ids_by_name(pool: &SqlitePool) -> sqlx::Result<HashMap<String, String>> {
    sqlx::query_as::<_, (String, String)>("SELECT name, id FROM heroes WHERE role IS NOT NULL")
        .fetch_all(pool)
        .await
        .map(|rows| rows.into_iter().collect())
}

/// Inserts the heroes seen in a replay.
///
/// Seeded heroes are left untouched; only the name of unseeded ones is updated.
pub async fn upsert_many(conn: &mut SqliteConnection, heroes: &[Hero]) -> sqlx::Result<()> {
    for chunk in heroes.chunks(chunk_rows(2)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO heroes (id, name) ")
            .push_values(chunk, |mut row, hero| {
                row.push_bind(&hero.id).push_bind(&hero.name);
            })
            .push(" ON CONFLICT (id) DO UPDATE SET name = excluded.name WHERE heroes.role IS NULL")
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}

/// Inserts the bundled hero facts, overwriting the stored ones, in a single transaction.
pub async fn seed(pool: &SqlitePool, facts: &[HeroFact]) -> sqlx::Result<()> {
    let mut tx = pool.begin().await?;
    for chunk in facts.chunks(chunk_rows(4)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO heroes (id, name, role, portrait) ")
            .push_values(chunk, |mut row, fact| {
                row.push_bind(&fact.id)
                    .push_bind(&fact.name)
                    .push_bind(fact.role)
                    .push_bind(&fact.portrait);
            })
            .push(
                " ON CONFLICT (id) DO UPDATE SET
                     name = excluded.name, role = excluded.role, portrait = excluded.portrait",
            )
            .build()
            .persistent(false)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await
}
