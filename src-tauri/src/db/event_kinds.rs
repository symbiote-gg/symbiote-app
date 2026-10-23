use std::collections::{BTreeSet, HashMap};

use sqlx::{QueryBuilder, Sqlite, SqliteConnection};

use super::chunk_rows;

/// Inserts the event kinds seen in a replay and returns their ids by name.
pub async fn upsert_many(
    conn: &mut SqliteConnection,
    names: &BTreeSet<&str>,
) -> sqlx::Result<HashMap<String, i64>> {
    let names: Vec<&str> = names.iter().copied().collect();
    let mut ids = HashMap::with_capacity(names.len());
    for chunk in names.chunks(chunk_rows(1)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO event_kinds (name) ")
            .push_values(chunk, |mut row, name| {
                row.push_bind(*name);
            })
            .push(" ON CONFLICT (name) DO NOTHING")
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;

        let mut query =
            QueryBuilder::<Sqlite>::new("SELECT name, id FROM event_kinds WHERE name IN (");
        let mut binds = query.separated(", ");
        for name in chunk {
            binds.push_bind(*name);
        }
        binds.push_unseparated(")");
        let rows = query
            .build_query_as::<(String, i64)>()
            .persistent(false)
            .fetch_all(&mut *conn)
            .await?;
        ids.extend(rows);
    }
    Ok(ids)
}
