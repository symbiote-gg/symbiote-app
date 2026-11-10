use std::collections::{BTreeSet, HashMap};

use sqlx::types::Json;
use sqlx::{Connection, QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use crate::db::{awards, chunk_rows, event_kinds, heroes, maps, parties, players, talents};
use crate::types::replay::{NewEvent, NewReplayBundle, NewReplayPlayer, NewTalent};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InsertOutcome {
    Inserted(i64),
    /// Overwrote the stored replay in place, from a longer file of its game or a re-parse.
    Refreshed(i64),
    Skipped,
}

/// Stores replays with their games, heroes, players and events, each atomically: either
/// all of a replay is written or none of it is.
///
/// A game can span several files, e.g. one per reconnect, and be recorded by several
/// accounts. Each owner keeps the longest file of a game: a shorter one is skipped, a
/// longer one takes over the stored replay in place. Either way the file left out is
/// recorded as superseded, so it isn't parsed again. The game is stored once, from the
/// longest file of any owner.
///
/// A bundle that [`refreshes`](NewReplayBundle::refreshes) a stored replay overwrites
/// it in place instead.
///
/// A game played before `events_cutoff` is stored without its events, see
/// [`events_cutoff`](crate::retention::events_cutoff).
///
/// Heroes, players and the owner's party are upserted first, since the game and replay
/// rows reference them.
///
/// They share one transaction to save a commit per replay, each in its own savepoint so
/// one that fails leaves the others stored. Returns each replay's outcome, in order.
pub async fn insert_bundles(
    pool: &SqlitePool,
    bundles: Vec<NewReplayBundle>,
    events_cutoff: i64,
) -> sqlx::Result<Vec<sqlx::Result<InsertOutcome>>> {
    let mut tx = pool.begin().await?;
    let mut outcomes = Vec::with_capacity(bundles.len());

    for bundle in bundles {
        let mut savepoint = tx.begin().await?;
        let outcome = match bundle.refreshes {
            Some(id) => refresh_bundle_in(&mut savepoint, id, bundle, events_cutoff).await,
            None => insert_bundle_in(&mut savepoint, bundle, events_cutoff).await,
        };
        match outcome {
            Ok(_) => savepoint.commit().await?,
            Err(_) => savepoint.rollback().await?,
        }
        outcomes.push(outcome);
    }

    tx.commit().await?;
    Ok(outcomes)
}

async fn insert_bundle_in(
    tx: &mut SqliteConnection,
    bundle: NewReplayBundle,
    events_cutoff: i64,
) -> sqlx::Result<InsertOutcome> {
    let existing: Option<(i64, i64, String, String)> = sqlx::query_as(
        "SELECT r.id, r.game_loops, r.hash, r.path
         FROM replays r
         JOIN games g ON g.id = r.game_id
         WHERE g.key = ? AND r.owner_player_id = (SELECT id FROM players WHERE toon = ?)",
    )
    .bind(&bundle.replay.game_key)
    .bind(&bundle.replay.owner_toon)
    .fetch_optional(&mut *tx)
    .await?;

    if let Some((id, game_loops, _, _)) = existing {
        if game_loops >= bundle.replay.game_loops {
            let file = (bundle.replay.hash, bundle.replay.path);
            insert_superseded(tx, id, &[file]).await?;
            return Ok(InsertOutcome::Skipped);
        }
    }

    let hero_ids = heroes::upsert_many(tx, &bundle.heroes).await?;
    let player_ids = players::upsert_many(tx, &bundle.players).await?;
    let owner_party_id = upsert_owner_party(tx, &bundle.owner_party, &player_ids).await?;
    let owner_player_id = id_of(&player_ids, "player", &bundle.replay.owner_toon)?;

    let game_id = store_game(tx, &bundle, &hero_ids, &player_ids, events_cutoff, false).await?;

    let replay = &bundle.replay;
    let Some((id, _, hash, path)) = existing else {
        let id = sqlx::query(
            "INSERT INTO replays (hash, path, game_id, owner_player_id, owner_party_id,
                 game_loops, is_new, ingest_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&replay.hash)
        .bind(&replay.path)
        .bind(game_id)
        .bind(owner_player_id)
        .bind(owner_party_id)
        .bind(replay.game_loops)
        .bind(replay.is_new)
        .bind(replay.ingest_version)
        .execute(&mut *tx)
        .await?
        .last_insert_rowid();
        return Ok(InsertOutcome::Inserted(id));
    };

    // The longer file takes over the replay, and the shorter one joins its superseded
    // files.
    insert_superseded(tx, id, &[(hash, path)]).await?;
    sqlx::query(
        "UPDATE replays SET hash = ?, path = ?, owner_party_id = ?, game_loops = ?,
             is_new = MAX(is_new, ?), ingest_version = ?, reparse = 0
         WHERE id = ?",
    )
    .bind(&replay.hash)
    .bind(&replay.path)
    .bind(owner_party_id)
    .bind(replay.game_loops)
    .bind(replay.is_new)
    .bind(replay.ingest_version)
    .bind(id)
    .execute(&mut *tx)
    .await?;
    Ok(InsertOutcome::Refreshed(id))
}

/// Overwrites the stored replay `id` with `bundle`, keeping its id, hash, seen state and
/// superseded files. Its game is overwritten too, unless another owner stored a longer
/// file of it.
async fn refresh_bundle_in(
    tx: &mut SqliteConnection,
    id: i64,
    bundle: NewReplayBundle,
    events_cutoff: i64,
) -> sqlx::Result<InsertOutcome> {
    let hero_ids = heroes::upsert_many(tx, &bundle.heroes).await?;
    let player_ids = players::upsert_many(tx, &bundle.players).await?;
    let owner_party_id = upsert_owner_party(tx, &bundle.owner_party, &player_ids).await?;

    let replay = &bundle.replay;
    let stored_game_id: Option<i64> = sqlx::query_scalar(
        "UPDATE replays SET path = ?, owner_party_id = ?, game_loops = ?, ingest_version = ?,
             reparse = 0
         WHERE id = ? AND hash = ?
         RETURNING game_id",
    )
    .bind(&replay.path)
    .bind(owner_party_id)
    .bind(replay.game_loops)
    .bind(replay.ingest_version)
    .bind(id)
    .bind(&replay.hash)
    .fetch_optional(&mut *tx)
    .await?;
    // Taken over by a longer file of the game since it was found stale.
    let Some(stored_game_id) = stored_game_id else {
        return Ok(InsertOutcome::Skipped);
    };

    let game_id = store_game(tx, &bundle, &hero_ids, &player_ids, events_cutoff, true).await?;

    // A new parser can fingerprint the game differently, moving the replay to another
    // game and leaving the old one behind.
    if game_id != stored_game_id {
        sqlx::query("UPDATE replays SET game_id = ? WHERE id = ?")
            .bind(game_id)
            .bind(id)
            .execute(&mut *tx)
            .await?;
        sqlx::query(
            "DELETE FROM games
             WHERE id = ?1 AND NOT EXISTS (SELECT 1 FROM replays WHERE game_id = ?1)",
        )
        .bind(stored_game_id)
        .execute(&mut *tx)
        .await?;
    }

    Ok(InsertOutcome::Refreshed(id))
}

/// Stores the game of `bundle` with its players and events, returning its id.
///
/// A stored game is overwritten only by a longer file, or one as long when `overwrite_ties`
/// is set so a re-parse of the file it came from refreshes it.
async fn store_game(
    tx: &mut SqliteConnection,
    bundle: &NewReplayBundle,
    hero_ids: &HashMap<String, i64>,
    player_ids: &HashMap<String, i64>,
    events_cutoff: i64,
    overwrite_ties: bool,
) -> sqlx::Result<i64> {
    let replay = &bundle.replay;
    let stored: Option<(i64, i64)> =
        sqlx::query_as("SELECT id, game_loops FROM games WHERE key = ?")
            .bind(&replay.game_key)
            .fetch_optional(&mut *tx)
            .await?;

    if let Some((id, game_loops)) = stored {
        let longer = replay.game_loops > game_loops;
        let tie = replay.game_loops == game_loops && overwrite_ties;
        if !longer && !tie {
            return Ok(id);
        }
    }

    maps::upsert_unseeded(&mut *tx, &replay.map).await?;

    let id = match stored {
        Some((id, _)) => {
            sqlx::query(
                "UPDATE games SET timestamp = ?, mode = ?, map = ?, duration = ?, game_loops = ?,
                     gates_open_loop = ?, winner_team = ?
                 WHERE id = ?",
            )
            .bind(replay.timestamp.timestamp())
            .bind(replay.mode)
            .bind(&replay.map)
            .bind(replay.duration)
            .bind(replay.game_loops)
            .bind(replay.gates_open_loop)
            .bind(replay.winner_team)
            .bind(id)
            .execute(&mut *tx)
            .await?;

            // Talents and awards cascade with the players.
            sqlx::query("DELETE FROM games_players WHERE game_id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;
            sqlx::query("DELETE FROM games_teams WHERE game_id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;
            sqlx::query("DELETE FROM events WHERE game_id = ?")
                .bind(id)
                .execute(&mut *tx)
                .await?;
            id
        }
        None => sqlx::query(
            "INSERT INTO games (key, timestamp, mode, map, duration, game_loops,
                 gates_open_loop, winner_team)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&replay.game_key)
        .bind(replay.timestamp.timestamp())
        .bind(replay.mode)
        .bind(&replay.map)
        .bind(replay.duration)
        .bind(replay.game_loops)
        .bind(replay.gates_open_loop)
        .bind(replay.winner_team)
        .execute(&mut *tx)
        .await?
        .last_insert_rowid(),
    };

    let players = &bundle.replay_players;
    insert_players(tx, id, players, hero_ids, player_ids).await?;
    insert_team_xp(tx, id, players).await?;
    insert_talents(tx, id, players, hero_ids, player_ids).await?;
    insert_awards(tx, id, players, player_ids).await?;
    if replay.timestamp.timestamp() >= events_cutoff {
        insert_events(tx, id, &bundle.events).await?;
    }
    Ok(id)
}

/// Looks up the id of a row upserted with the replay, e.g. a hero by slug.
fn id_of(ids: &HashMap<String, i64>, what: &str, key: &str) -> sqlx::Result<i64> {
    ids.get(key).copied().ok_or_else(|| missing_id(what, key))
}

fn missing_id(what: &str, key: &str) -> sqlx::Error {
    sqlx::Error::Protocol(format!("no stored {what} id for {key:?}"))
}

/// Upserts the party of the owner's premade `toons`, returning `None` when they queued
/// solo.
async fn upsert_owner_party(
    conn: &mut SqliteConnection,
    toons: &[String],
    player_ids: &HashMap<String, i64>,
) -> sqlx::Result<Option<i64>> {
    let member_ids = toons
        .iter()
        .map(|toon| id_of(player_ids, "player", toon))
        .collect::<sqlx::Result<Vec<_>>>()?;
    parties::upsert(conn, &member_ids).await
}

async fn insert_players(
    conn: &mut SqliteConnection,
    game_id: i64,
    players: &[NewReplayPlayer],
    hero_ids: &HashMap<String, i64>,
    player_ids: &HashMap<String, i64>,
) -> sqlx::Result<()> {
    let rows = players
        .iter()
        .map(|player| {
            Ok((
                player,
                id_of(player_ids, "player", &player.toon)?,
                id_of(hero_ids, "hero", &player.hero_slug)?,
            ))
        })
        .collect::<sqlx::Result<Vec<_>>>()?;
    for chunk in rows.chunks(chunk_rows(10)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO games_players (game_id, player_id, slot, team, hero_id,
                 time_dead_secs, time_on_fire_secs, upvotes, party, score) ",
        )
        .push_values(chunk, |mut row, (player, player_id, hero_id)| {
            row.push_bind(game_id)
                .push_bind(*player_id)
                .push_bind(player.slot)
                .push_bind(player.team)
                .push_bind(*hero_id)
                .push_bind(player.time_dead_secs)
                .push_bind(player.time_on_fire_secs)
                .push_bind(player.upvotes)
                .push_bind(player.party)
                .push("jsonb(")
                .push_bind_unseparated(Json(&player.score))
                .push_unseparated(")");
        })
        .build()
        .persistent(false)
        .execute(&mut *conn)
        .await?;
    }
    Ok(())
}

/// Stores each team's XP breakdown, which the parser hands every player of the team.
async fn insert_team_xp(
    conn: &mut SqliteConnection,
    game_id: i64,
    players: &[NewReplayPlayer],
) -> sqlx::Result<()> {
    let mut teams: Vec<(i64, &serde_json::Value)> = Vec::new();
    for player in players {
        if let Some(xp) = &player.xp {
            if !teams.iter().any(|(team, _)| *team == player.team) {
                teams.push((player.team, xp));
            }
        }
    }
    if teams.is_empty() {
        return Ok(());
    }

    QueryBuilder::<Sqlite>::new("INSERT INTO games_teams (game_id, team, xp) ")
        .push_values(&teams, |mut row, (team, xp)| {
            row.push_bind(game_id)
                .push_bind(*team)
                .push("jsonb(")
                .push_bind_unseparated(Json(*xp))
                .push_unseparated(")");
        })
        .build()
        .persistent(false)
        .execute(&mut *conn)
        .await?;
    Ok(())
}

async fn insert_talents(
    conn: &mut SqliteConnection,
    game_id: i64,
    players: &[NewReplayPlayer],
    hero_ids: &HashMap<String, i64>,
    player_ids: &HashMap<String, i64>,
) -> sqlx::Result<()> {
    let mut picks: Vec<(i64, i64, &NewTalent)> = Vec::new();
    for player in players {
        let player_id = id_of(player_ids, "player", &player.toon)?;
        let hero_id = id_of(hero_ids, "hero", &player.hero_slug)?;
        picks.extend(
            player
                .talents
                .iter()
                .map(|talent| (player_id, hero_id, talent)),
        );
    }
    let hero_talents: Vec<(i64, &NewTalent)> = picks
        .iter()
        .map(|&(_, hero_id, talent)| (hero_id, talent))
        .collect();
    let talent_ids = talents::upsert_many(conn, &hero_talents).await?;

    let rows = picks
        .into_iter()
        .map(|(player_id, hero_id, talent)| {
            let talent_id = talent_ids
                .get(&hero_id)
                .and_then(|ids| ids.get(&talent.slug))
                .copied()
                .ok_or_else(|| missing_id("talent", &talent.slug))?;
            Ok((player_id, talent_id, talent))
        })
        .collect::<sqlx::Result<Vec<_>>>()?;
    for chunk in rows.chunks(chunk_rows(5)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO games_players_talents (game_id, player_id, tier, talent_id, gameloop) ",
        )
        .push_values(chunk, |mut row, (player_id, talent_id, talent)| {
            row.push_bind(game_id)
                .push_bind(*player_id)
                .push_bind(talent.tier)
                .push_bind(*talent_id)
                .push_bind(talent.gameloop);
        })
        .build()
        .persistent(false)
        .execute(&mut *conn)
        .await?;
    }
    Ok(())
}

async fn insert_awards(
    conn: &mut SqliteConnection,
    game_id: i64,
    players: &[NewReplayPlayer],
    player_ids: &HashMap<String, i64>,
) -> sqlx::Result<()> {
    let mut rows: Vec<(i64, &str)> = Vec::new();
    for player in players {
        let player_id = id_of(player_ids, "player", &player.toon)?;
        rows.extend(
            player
                .awards
                .iter()
                .map(|award| (player_id, award.as_str())),
        );
    }

    let ids: BTreeSet<&str> = rows.iter().map(|(_, award)| *award).collect();
    awards::upsert_unseeded(conn, &ids).await?;

    for chunk in rows.chunks(chunk_rows(3)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO games_players_awards (game_id, player_id, award) ",
        )
        .push_values(chunk, |mut row, (player_id, award)| {
            row.push_bind(game_id)
                .push_bind(*player_id)
                .push_bind(*award);
        })
        .build()
        .persistent(false)
        .execute(&mut *conn)
        .await?;
    }
    Ok(())
}

async fn insert_events(
    conn: &mut SqliteConnection,
    game_id: i64,
    events: &[NewEvent],
) -> sqlx::Result<()> {
    let kinds: BTreeSet<&str> = events.iter().map(|event| event.kind.as_str()).collect();
    let kind_ids = event_kinds::upsert_many(conn, &kinds).await?;
    let rows = events
        .iter()
        .map(|event| Ok((id_of(&kind_ids, "event kind", &event.kind)?, event)))
        .collect::<sqlx::Result<Vec<_>>>()?;
    for chunk in rows.chunks(chunk_rows(5)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO events (game_id, kind_id, gameloop, team, data) ")
            .push_values(chunk, |mut row, (kind_id, event)| {
                row.push_bind(game_id)
                    .push_bind(*kind_id)
                    .push_bind(event.gameloop)
                    .push_bind(event.team)
                    .push("jsonb(")
                    .push_bind_unseparated(Json(&event.data))
                    .push_unseparated(")");
            })
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}

async fn insert_superseded(
    conn: &mut SqliteConnection,
    replay_id: i64,
    files: &[(String, String)],
) -> sqlx::Result<()> {
    for chunk in files.chunks(chunk_rows(3)) {
        QueryBuilder::<Sqlite>::new("INSERT INTO superseded_replays (hash, path, replay_id) ")
            .push_values(chunk, |mut row, (hash, path)| {
                row.push_bind(hash).push_bind(path).push_bind(replay_id);
            })
            .build()
            .persistent(false)
            .execute(&mut *conn)
            .await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::replays::{count, get_detail, mark_stale, sibling_ids, HashStatus};
    use crate::db::test_utils::pool;
    use crate::types::player::Player;

    fn partied(name: &str, game_id: &str) -> NewReplayBundle {
        let mut game = bundle(name, 1000);
        game.replay.game_key = hex(game_id);
        game.players.push(Player {
            toon: "friend".to_owned(),
            name: "Friend".to_owned(),
            account_level: None,
        });
        game.owner_party = vec!["owner".to_owned(), "friend".to_owned()];
        game
    }

    async fn owner_party_id(pool: &SqlitePool, name: &str) -> Option<i64> {
        sqlx::query_scalar("SELECT owner_party_id FROM replays WHERE hash = ?")
            .bind(hex(name))
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn reuses_the_party_of_the_same_members() {
        let pool = pool().await;
        insert_bundle(&pool, partied("a", "game a")).await.unwrap();
        insert_bundle(&pool, partied("b", "game b")).await.unwrap();
        let mut solo = bundle("c", 1000);
        solo.replay.game_key = hex("game c");
        insert_bundle(&pool, solo).await.unwrap();

        let party = owner_party_id(&pool, "a").await;
        assert!(party.is_some());
        assert_eq!(owner_party_id(&pool, "b").await, party);
        assert_eq!(owner_party_id(&pool, "c").await, None);

        let (parties, members): (i64, i64) = sqlx::query_as(
            "SELECT (SELECT count(*) FROM parties), (SELECT count(*) FROM parties_players)",
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!((parties, members), (1, 2));
    }

    #[tokio::test]
    async fn keeps_the_highest_account_level() {
        let pool = pool().await;
        for (name, level) in [("a", Some(500)), ("b", Some(300)), ("c", None)] {
            let mut game = bundle(name, 1000);
            game.replay.game_key = hex(name);
            game.players[0].account_level = level;
            insert_bundle(&pool, game).await.unwrap();
        }

        let level: Option<i64> =
            sqlx::query_scalar("SELECT account_level FROM players WHERE toon = 'owner'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(level, Some(500));
    }

    #[tokio::test]
    async fn keeps_only_the_longest_replay_of_a_game() {
        let pool = pool().await;

        let InsertOutcome::Inserted(first) = insert_bundle(&pool, bundle("a", 1000)).await.unwrap()
        else {
            panic!("the first replay should be inserted");
        };

        let shorter = insert_bundle(&pool, bundle("b", 500)).await.unwrap();
        assert_eq!(shorter, InsertOutcome::Skipped);
        assert_eq!(status(&pool, "b").await, HashStatus::Current);

        let longer = insert_bundle(&pool, bundle("c", 2000)).await.unwrap();
        assert_eq!(longer, InsertOutcome::Refreshed(first));
        assert_eq!(count(&pool).await.unwrap(), 1);
        for hash in ["a", "b", "c"] {
            assert_ne!(
                status(&pool, hash).await,
                HashStatus::Unknown,
                "{hash} forgotten"
            );
        }

        let detail = get_detail(&pool, first, 0).await.unwrap().unwrap();
        assert_eq!(detail.replay.hash, hex("c"));
        assert_eq!(detail.replay.duration, 2000 / 16);
        assert_eq!(detail.players.len(), 1);
        assert_eq!(detail.players[0].awards.len(), 1);
    }

    async fn count_of(pool: &SqlitePool, query: &'static str) -> i64 {
        sqlx::query_scalar(query).fetch_one(pool).await.unwrap()
    }

    #[tokio::test]
    async fn stores_a_game_once_for_all_its_owners() {
        let pool = pool().await;
        let InsertOutcome::Inserted(mine) = insert_bundle(&pool, recorded_by("a", "owner", 1000))
            .await
            .unwrap()
        else {
            panic!("the owner's replay should be inserted");
        };
        let InsertOutcome::Inserted(theirs) =
            insert_bundle(&pool, recorded_by("b", "friend", 1000))
                .await
                .unwrap()
        else {
            panic!("the friend's replay should be inserted");
        };

        assert_eq!(count(&pool).await.unwrap(), 2);
        assert_eq!(count_of(&pool, "SELECT COUNT(*) FROM games").await, 1);
        assert_eq!(
            count_of(&pool, "SELECT COUNT(*) FROM games_players").await,
            2
        );
        assert_eq!(count_of(&pool, "SELECT COUNT(*) FROM games_teams").await, 2);
        assert_eq!(count_of(&pool, "SELECT COUNT(*) FROM events").await, 1);

        let mine = get_detail(&pool, mine, 0).await.unwrap().unwrap();
        let theirs = get_detail(&pool, theirs, 0).await.unwrap().unwrap();
        assert_eq!(
            (mine.replay.owner_team, mine.replay.owner_win),
            (0, Some(true))
        );
        assert_eq!(
            (theirs.replay.owner_team, theirs.replay.owner_win),
            (1, Some(false))
        );
        assert_eq!(theirs.replay.hash, hex("b"));
    }

    #[tokio::test]
    async fn rewrites_a_game_from_another_owners_longer_file() {
        let pool = pool().await;
        let InsertOutcome::Inserted(mine) = insert_bundle(&pool, recorded_by("a", "owner", 1000))
            .await
            .unwrap()
        else {
            panic!("the owner's replay should be inserted");
        };
        let InsertOutcome::Inserted(theirs) =
            insert_bundle(&pool, recorded_by("b", "friend", 2000))
                .await
                .unwrap()
        else {
            panic!("the friend's replay should be inserted");
        };

        let detail = get_detail(&pool, mine, 0).await.unwrap().unwrap();
        assert_eq!(detail.replay.hash, hex("a"));
        assert_eq!(detail.replay.duration, 2000 / 16);
        assert_eq!(count_of(&pool, "SELECT COUNT(*) FROM games_teams").await, 2);
        assert_eq!(count_of(&pool, "SELECT COUNT(*) FROM events").await, 1);
        assert_eq!(sibling_ids(&pool, mine).await.unwrap(), [theirs]);

        // The owner's shorter file doesn't overwrite the friend's on a re-parse.
        mark_stale(&pool, &[mine]).await.unwrap();
        let mut reparse = recorded_by("a", "owner", 1000);
        reparse.refreshes = Some(mine);
        let outcome = insert_bundle(&pool, reparse).await.unwrap();
        assert_eq!(outcome, InsertOutcome::Refreshed(mine));
        let detail = get_detail(&pool, mine, 0).await.unwrap().unwrap();
        assert_eq!(detail.replay.duration, 2000 / 16);
    }

    #[tokio::test]
    async fn refreshes_a_stale_replay_in_place() {
        let pool = pool().await;
        let mut stale = bundle("a", 1000);
        stale.replay.ingest_version = VERSION - 1;
        stale.replay.is_new = true;
        stale.events = vec![NewEvent {
            kind: "death".to_owned(),
            gameloop: 100,
            team: Some(0),
            data: serde_json::json!({ "victim": 1 }),
        }];
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, stale).await.unwrap() else {
            panic!("the replay should be inserted");
        };
        insert_bundle(&pool, bundle("b", 500)).await.unwrap();
        assert_eq!(status(&pool, "a").await, HashStatus::Stale(id));
        assert_eq!(status(&pool, "c").await, HashStatus::Unknown);
        assert_eq!(owner_party_id(&pool, "a").await, None);

        let mut fresh = partied("a", "game");
        fresh.replay.path = "moved/a.StormReplay".to_owned();
        fresh.replay_players[0].awards = vec![];
        fresh.events = vec![NewEvent {
            kind: "death".to_owned(),
            gameloop: 100,
            team: Some(0),
            data: serde_json::json!({
                "victim": 1,
                "killers": [],
                "x": 0.0,
                "y": 0.0,
                "allies_nearby": 0,
            }),
        }];
        fresh.refreshes = Some(id);
        let outcome = insert_bundle(&pool, fresh).await.unwrap();
        assert_eq!(outcome, InsertOutcome::Refreshed(id));
        assert_eq!(status(&pool, "a").await, HashStatus::Current);
        assert_eq!(status(&pool, "b").await, HashStatus::Current);
        assert!(owner_party_id(&pool, "a").await.is_some());

        let detail = get_detail(&pool, id, 0).await.unwrap().unwrap();
        assert_eq!(detail.replay.path, "moved/a.StormReplay");
        assert!(detail.replay.is_new);
        assert!(detail.players[0].awards.is_empty());
        assert_eq!(detail.timeline.deaths.len(), 1);
        assert_eq!(detail.timeline.deaths[0].allies_nearby, Some(0));

        let kind: String =
            sqlx::query_scalar("SELECT typeof(data) FROM events WHERE game_id = (SELECT game_id FROM replays WHERE id = ?)")
                .bind(id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(kind, "blob");
    }

    fn pick(tier: i64, slug: &str) -> NewTalent {
        NewTalent {
            tier,
            slug: slug.to_owned(),
            gameloop: tier * 1000,
        }
    }

    #[tokio::test]
    async fn stores_picks_of_seeded_and_unseeded_talents() {
        let pool = pool().await;
        sqlx::query("INSERT INTO heroes (slug, name) VALUES ('Wizard', 'Li-Ming')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO talents (hero_id, slug, tier, name)
             SELECT id, 'seeded', 1, 'Seeded' FROM heroes",
        )
        .execute(&pool)
        .await
        .unwrap();

        let mut ids = Vec::new();
        for game in ["a", "b"] {
            let mut replay = bundle(game, 1000);
            replay.replay.game_key = hex(game);
            replay.replay_players[0].talents = vec![pick(1, "seeded"), pick(4, "unseeded")];
            let InsertOutcome::Inserted(id) = insert_bundle(&pool, replay).await.unwrap() else {
                panic!("the replay should be inserted");
            };
            ids.push(id);
        }

        let first = get_detail(&pool, ids[0], 0).await.unwrap().unwrap();
        let second = get_detail(&pool, ids[1], 0).await.unwrap().unwrap();
        let talents = &first.players[0].talents;
        assert_eq!(talents[0].slug, "seeded");
        assert_eq!(talents[0].name.as_deref(), Some("Seeded"));
        assert_eq!(talents[1].slug, "unseeded");
        assert_eq!(talents[1].name, None);
        assert_eq!(talents[1].talent_id, second.players[0].talents[1].talent_id);

        let stored: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM talents")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(stored, 2);
    }

    #[tokio::test]
    async fn stores_unseeded_maps_and_awards_until_seeded() {
        let pool = pool().await;
        let mut game = bundle("a", 1000);
        game.replay.map = "New Map".to_owned();
        game.replay_players[0].awards = vec!["new_award".to_owned()];
        insert_bundle(&pool, game).await.unwrap();

        let map: String = sqlx::query_scalar("SELECT name FROM maps WHERE id = 'New Map'")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(map, "New Map");
        let award: Option<String> =
            sqlx::query_scalar("SELECT name FROM awards WHERE id = 'new_award'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(award, None);

        crate::db::awards::seed(
            &pool,
            &[crate::types::award::AwardFact {
                id: "new_award".to_owned(),
                name: "New Award".to_owned(),
                description: None,
                icon: None,
            }],
        )
        .await
        .unwrap();
        let award: Option<String> =
            sqlx::query_scalar("SELECT name FROM awards WHERE id = 'new_award'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(award.as_deref(), Some("New Award"));
    }

    #[tokio::test]
    async fn rejects_a_talent_of_another_hero() {
        let pool = pool().await;
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, bundle("a", 1000)).await.unwrap()
        else {
            panic!("the replay should be inserted");
        };
        sqlx::query(
            "INSERT INTO heroes (slug, name) VALUES ('Other', 'Other');
             INSERT INTO talents (hero_id, slug, tier)
             SELECT id, 'other', 1 FROM heroes WHERE slug = 'Other'",
        )
        .execute(&pool)
        .await
        .unwrap();

        let picked = sqlx::query(
            "INSERT INTO games_players_talents (game_id, player_id, tier, talent_id, gameloop)
             SELECT r.game_id, p.id, 1, t.id, 0
             FROM replays r, players p, talents t
             WHERE r.id = ? AND t.slug = 'other'",
        )
        .bind(id)
        .execute(&pool)
        .await
        .unwrap_err();
        assert!(picked.to_string().contains("another hero"), "{picked}");
    }

    #[tokio::test]
    async fn skips_events_of_expired_replays_on_ingest() {
        let pool = pool().await;
        let mut outcomes = insert_bundles(&pool, vec![game_with_events("old", 100)], 200)
            .await
            .unwrap();
        let Ok(InsertOutcome::Inserted(old)) = outcomes.remove(0) else {
            panic!("the replay should be inserted");
        };
        assert_eq!(event_count(&pool, old).await, 0);

        let mut stale = game_with_events("stale", 100);
        stale.replay.ingest_version = VERSION - 1;
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, stale).await.unwrap() else {
            panic!("the replay should be inserted");
        };
        assert_eq!(event_count(&pool, id).await, 1);

        let mut fresh = game_with_events("stale", 100);
        fresh.refreshes = Some(id);
        let mut outcomes = insert_bundles(&pool, vec![fresh], 200).await.unwrap();
        assert_eq!(outcomes.remove(0).unwrap(), InsertOutcome::Refreshed(id));
        assert_eq!(event_count(&pool, id).await, 0);
    }

    #[tokio::test]
    async fn refresh_clears_the_reparse_flag() {
        let pool = pool().await;
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, bundle("a", 1000)).await.unwrap()
        else {
            panic!("the replay should be inserted");
        };

        mark_stale(&pool, &[id]).await.unwrap();
        assert_eq!(status(&pool, "a").await, HashStatus::Stale(id));

        let mut fresh = bundle("a", 1000);
        fresh.refreshes = Some(id);
        assert_eq!(
            insert_bundle(&pool, fresh).await.unwrap(),
            InsertOutcome::Refreshed(id)
        );
        assert_eq!(status(&pool, "a").await, HashStatus::Current);
    }
}
