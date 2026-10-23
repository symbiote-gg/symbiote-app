use sqlx::{QueryBuilder, Sqlite, SqliteConnection};

use super::chunk_rows;

/// Inserts the party of `member_ids` unless it's already stored, and returns its id, or
/// `None` for no members.
///
/// A party is its set of members, so the same group in another game gets the same id.
pub async fn upsert(conn: &mut SqliteConnection, member_ids: &[i64]) -> sqlx::Result<Option<i64>> {
    if member_ids.is_empty() {
        return Ok(None);
    }
    let mut ids = member_ids.to_vec();
    ids.sort_unstable();
    ids.dedup();
    let members = ids.iter().map(i64::to_string).collect::<Vec<_>>().join(",");

    let inserted: Option<i64> = sqlx::query_scalar(
        "INSERT INTO parties (members) VALUES (?)
         ON CONFLICT (members) DO NOTHING
         RETURNING id",
    )
    .bind(&members)
    .fetch_optional(&mut *conn)
    .await?;
    // A stored party already has its members linked.
    let Some(party_id) = inserted else {
        let party_id = sqlx::query_scalar("SELECT id FROM parties WHERE members = ?")
            .bind(&members)
            .fetch_one(&mut *conn)
            .await?;
        return Ok(Some(party_id));
    };

    for chunk in ids.chunks(chunk_rows(2)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO parties_players (party_id, player_id) ")
            .push_values(chunk, |mut row, player_id| {
                row.push_bind(party_id).push_bind(*player_id);
            })
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }
    Ok(Some(party_id))
}
