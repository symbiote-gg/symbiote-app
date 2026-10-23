use sqlx::{QueryBuilder, Sqlite, SqlitePool};

use super::chunk_rows;
use crate::types::talent::TalentFact;

pub async fn seed(pool: &SqlitePool, facts: &[TalentFact]) -> sqlx::Result<()> {
    let mut tx = pool.begin().await?;
    for chunk in facts.chunks(chunk_rows(6)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO talents (hero_id, id, tier, name, description, icon) ",
        )
        .push_values(chunk, |mut row, fact| {
            row.push_bind(&fact.hero_id)
                .push_bind(&fact.id)
                .push_bind(fact.tier)
                .push_bind(&fact.name)
                .push_bind(&fact.description)
                .push_bind(&fact.icon);
        })
        .push(
            " ON CONFLICT (hero_id, id) DO UPDATE SET
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
