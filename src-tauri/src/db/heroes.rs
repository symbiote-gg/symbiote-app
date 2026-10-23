use std::collections::HashMap;

use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use super::chunk_rows;
use crate::types::hero::{Hero, HeroFact};

/// Maps hero names to slugs for the heroes seeded from the bundled facts.
pub async fn seeded_slugs_by_name(pool: &SqlitePool) -> sqlx::Result<HashMap<String, String>> {
    sqlx::query_as::<_, (String, String)>("SELECT name, slug FROM heroes WHERE role IS NOT NULL")
        .fetch_all(pool)
        .await
        .map(|rows| rows.into_iter().collect())
}

/// Inserts the heroes seen in a replay and returns their ids by slug.
///
/// Seeded heroes are left untouched; only the name of unseeded ones is updated.
pub async fn upsert_many(
    conn: &mut SqliteConnection,
    heroes: &[Hero],
) -> sqlx::Result<HashMap<String, i64>> {
    for chunk in heroes.chunks(chunk_rows(2)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO heroes (slug, name) ")
            .push_values(chunk, |mut row, hero| {
                row.push_bind(&hero.slug).push_bind(&hero.name);
            })
            .push(
                " ON CONFLICT (slug) DO UPDATE SET name = excluded.name WHERE heroes.role IS NULL",
            )
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }

    let mut ids = HashMap::with_capacity(heroes.len());
    for chunk in heroes.chunks(chunk_rows(1)) {
        let mut query = QueryBuilder::<Sqlite>::new("SELECT slug, id FROM heroes WHERE slug IN (");
        let mut slugs = query.separated(", ");
        for hero in chunk {
            slugs.push_bind(&hero.slug);
        }
        slugs.push_unseparated(")");
        let rows = query
            .build_query_as::<(String, i64)>()
            .persistent(false)
            .fetch_all(&mut *conn)
            .await?;
        ids.extend(rows);
    }
    Ok(ids)
}

/// Inserts the bundled hero facts, overwriting the stored ones, in a single transaction.
pub async fn seed(pool: &SqlitePool, facts: &[HeroFact]) -> sqlx::Result<()> {
    let mut tx = pool.begin().await?;
    for chunk in facts.chunks(chunk_rows(4)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO heroes (slug, name, role, portrait) ")
            .push_values(chunk, |mut row, fact| {
                row.push_bind(&fact.slug)
                    .push_bind(&fact.name)
                    .push_bind(fact.role)
                    .push_bind(&fact.portrait);
            })
            .push(
                " ON CONFLICT (slug) DO UPDATE SET
                     name = excluded.name, role = excluded.role, portrait = excluded.portrait",
            )
            .build()
            .persistent(false)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await
}

/// Maps hero slugs to ids, for the bundled facts that reference heroes by slug.
pub async fn ids_by_slug(pool: &SqlitePool) -> sqlx::Result<HashMap<String, i64>> {
    sqlx::query_as::<_, (String, i64)>("SELECT slug, id FROM heroes")
        .fetch_all(pool)
        .await
        .map(|rows| rows.into_iter().collect())
}
