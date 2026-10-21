use sqlx::{QueryBuilder, Sqlite, SqliteConnection};

use super::chunk_rows;
use crate::types::player::Player;

pub async fn upsert_many(conn: &mut SqliteConnection, players: &[Player]) -> sqlx::Result<()> {
    for chunk in players.chunks(chunk_rows(2)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO players (id, name) ")
            .push_values(chunk, |mut row, player| {
                row.push_bind(&player.id).push_bind(&player.name);
            })
            .push(" ON CONFLICT (id) DO UPDATE SET name = excluded.name")
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}
