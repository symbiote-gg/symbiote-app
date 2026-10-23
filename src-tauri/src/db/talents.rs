use std::collections::{BTreeSet, HashMap};

use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use super::{chunk_rows, heroes};
use crate::types::replay::NewTalent;
use crate::types::talent::TalentFact;

/// Inserts the talents picked in a replay, each with its hero's id, and returns the ids
/// of all the talents of those heroes by hero id, then slug.
///
/// Seeded talents are left untouched; unseeded ones are stored without a name.
pub async fn upsert_many(
    conn: &mut SqliteConnection,
    picks: &[(i64, &NewTalent)],
) -> sqlx::Result<HashMap<i64, HashMap<String, i64>>> {
    if picks.is_empty() {
        return Ok(HashMap::new());
    }

    for chunk in picks.chunks(chunk_rows(3)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO talents (hero_id, slug, tier) ")
            .push_values(chunk, |mut row, (hero_id, talent)| {
                row.push_bind(*hero_id)
                    .push_bind(&talent.slug)
                    .push_bind(talent.tier);
            })
            .push(" ON CONFLICT (hero_id, slug) DO NOTHING")
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }

    let hero_ids: BTreeSet<i64> = picks.iter().map(|(hero_id, _)| *hero_id).collect();
    let mut query =
        QueryBuilder::<Sqlite>::new("SELECT hero_id, slug, id FROM talents WHERE hero_id IN (");
    let mut ids = query.separated(", ");
    for hero_id in hero_ids {
        ids.push_bind(hero_id);
    }
    ids.push_unseparated(")");
    let rows = query
        .build_query_as::<(i64, String, i64)>()
        .persistent(false)
        .fetch_all(&mut *conn)
        .await?;
    let mut ids: HashMap<i64, HashMap<String, i64>> = HashMap::new();
    for (hero_id, slug, id) in rows {
        ids.entry(hero_id).or_default().insert(slug, id);
    }
    Ok(ids)
}

/// Inserts the bundled talent facts, overwriting the stored ones, in a single transaction.
///
/// Facts of heroes that aren't seeded are skipped.
pub async fn seed(pool: &SqlitePool, facts: &[TalentFact]) -> sqlx::Result<()> {
    let hero_ids = heroes::ids_by_slug(pool).await?;
    let rows: Vec<(i64, &TalentFact)> = facts
        .iter()
        .filter_map(|fact| match hero_ids.get(&fact.hero_slug) {
            Some(&hero_id) => Some((hero_id, fact)),
            None => {
                log::warn!(
                    "skipped talent {} of unknown hero {}",
                    fact.slug,
                    fact.hero_slug
                );
                None
            }
        })
        .collect();

    let mut tx = pool.begin().await?;
    for chunk in rows.chunks(chunk_rows(6)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO talents (hero_id, slug, tier, name, description, icon) ",
        )
        .push_values(chunk, |mut row, (hero_id, fact)| {
            row.push_bind(*hero_id)
                .push_bind(&fact.slug)
                .push_bind(fact.tier)
                .push_bind(&fact.name)
                .push_bind(&fact.description)
                .push_bind(&fact.icon);
        })
        .push(
            " ON CONFLICT (hero_id, slug) DO UPDATE SET
                 tier = excluded.tier, name = excluded.name,
                 description = excluded.description, icon = excluded.icon",
        )
        .build()
        .persistent(false)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await
}
