use std::collections::HashMap;

use sqlx::{QueryBuilder, Sqlite, SqliteConnection};

use super::chunk_rows;
use crate::types::player::Player;

/// Inserts the players seen in a replay, updating their names, and returns their ids by
/// toon.
pub async fn upsert_many(
    conn: &mut SqliteConnection,
    players: &[Player],
) -> sqlx::Result<HashMap<String, i64>> {
    for chunk in players.chunks(chunk_rows(2)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO players (toon, name) ")
            .push_values(chunk, |mut row, player| {
                row.push_bind(&player.toon).push_bind(&player.name);
            })
            .push(" ON CONFLICT (toon) DO UPDATE SET name = excluded.name")
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }

    let mut ids = HashMap::with_capacity(players.len());
    for chunk in players.chunks(chunk_rows(1)) {
        let mut query = QueryBuilder::<Sqlite>::new("SELECT toon, id FROM players WHERE toon IN (");
        let mut toons = query.separated(", ");
        for player in chunk {
            toons.push_bind(&player.toon);
        }
        toons.push_unseparated(")");
        let rows = query
            .build_query_as::<(String, i64)>()
            .persistent(false)
            .fetch_all(&mut *conn)
            .await?;
        ids.extend(rows);
    }
    Ok(ids)
}
