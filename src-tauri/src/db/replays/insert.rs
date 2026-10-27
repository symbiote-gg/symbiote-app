use std::collections::{BTreeSet, HashMap};

use sqlx::types::Json;
use sqlx::{Connection, QueryBuilder, Sqlite, SqliteConnection, SqliteExecutor, SqlitePool};

use crate::db::{chunk_rows, event_kinds, heroes, parties, players, talents};
use crate::types::replay::{NewEvent, NewReplay, NewReplayBundle, NewReplayPlayer, NewTalent};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InsertOutcome {
    Inserted(i64),
    Replaced { removed: i64, id: i64 },
    Refreshed(i64),
    Skipped,
}

/// Stores replays with their heroes, players and events, each atomically: either all of
/// a replay is written or none of it is.
///
/// A game can span several files, e.g. one per reconnect, so only the longest replay of
/// a game is kept per owner: a shorter one is skipped, a longer one replaces the stored
/// replay. Either way the file left out is recorded as superseded, so it isn't parsed
/// again.
///
/// A bundle that [`refreshes`](NewReplayBundle::refreshes) a stored replay overwrites
/// it in place instead.
///
/// A replay played before `events_cutoff` is stored without its events, see
/// [`events_cutoff`](crate::retention::events_cutoff).
///
/// Heroes, players and the owner's party are upserted first, since the replay rows
/// reference them.
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
    let existing: Option<(i64, i64)> = sqlx::query_as(
        "SELECT id, game_loops FROM replays
         WHERE game_id = ? AND owner_player_id = (SELECT id FROM players WHERE toon = ?)",
    )
    .bind(&bundle.replay.game_id)
    .bind(&bundle.replay.owner_toon)
    .fetch_optional(&mut *tx)
    .await?;

    let mut superseded = Vec::new();
    if let Some((existing_id, existing_loops)) = existing {
        if existing_loops >= bundle.replay.game_loops {
            let file = (bundle.replay.hash, bundle.replay.path);
            insert_superseded(tx, existing_id, &[file]).await?;
            return Ok(InsertOutcome::Skipped);
        }

        // Carry the shorter replay's file, and the files it superseded, over to the new
        // replay before the delete cascades them away.
        superseded = sqlx::query_as(
            "SELECT hash, path FROM replays WHERE id = ?1
             UNION ALL
             SELECT hash, path FROM superseded_replays WHERE replay_id = ?1",
        )
        .bind(existing_id)
        .fetch_all(&mut *tx)
        .await?;
        sqlx::query("DELETE FROM replays WHERE id = ?")
            .bind(existing_id)
            .execute(&mut *tx)
            .await?;
    }

    let hero_ids = heroes::upsert_many(tx, &bundle.heroes).await?;
    let player_ids = players::upsert_many(tx, &bundle.players).await?;
    let owner_party_id = upsert_owner_party(tx, &bundle.owner_party, &player_ids).await?;

    let owner_hero_id = id_of(&hero_ids, "hero", &bundle.replay.owner_hero_slug)?;
    let owner_player_id = id_of(&player_ids, "player", &bundle.replay.owner_toon)?;
    let replay_id = insert_replay(
        &mut *tx,
        &bundle.replay,
        owner_hero_id,
        owner_player_id,
        owner_party_id,
    )
    .await?;

    let players = &bundle.replay_players;
    insert_players(tx, replay_id, players, &hero_ids, &player_ids).await?;
    insert_talents(tx, replay_id, players, &hero_ids, &player_ids).await?;
    insert_awards(tx, replay_id, players, &player_ids).await?;
    if bundle.replay.timestamp.timestamp() >= events_cutoff {
        insert_events(tx, replay_id, &bundle.events).await?;
    }
    insert_superseded(tx, replay_id, &superseded).await?;

    Ok(match existing {
        Some((removed, _)) => InsertOutcome::Replaced {
            removed,
            id: replay_id,
        },
        None => InsertOutcome::Inserted(replay_id),
    })
}

/// Overwrites the stored replay `id` with `bundle`, keeping its id, hash, seen state and
/// superseded files.
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
    let updated = sqlx::query(
        "UPDATE replays SET path = ?, game_id = ?, timestamp = ?, mode = ?, map = ?,
             owner_hero_id = ?, owner_player_id = ?, owner_party_id = ?, owner_win = ?,
             duration = ?, game_loops = ?, gates_open_loop = ?, ingest_version = ?
         WHERE id = ?",
    )
    .bind(&replay.path)
    .bind(&replay.game_id)
    .bind(replay.timestamp.timestamp())
    .bind(replay.mode)
    .bind(&replay.map)
    .bind(id_of(&hero_ids, "hero", &replay.owner_hero_slug)?)
    .bind(id_of(&player_ids, "player", &replay.owner_toon)?)
    .bind(owner_party_id)
    .bind(replay.owner_win)
    .bind(replay.duration)
    .bind(replay.game_loops)
    .bind(replay.gates_open_loop)
    .bind(replay.ingest_version)
    .bind(id)
    .execute(&mut *tx)
    .await?;
    // Replaced by a longer replay of the game since it was found stale.
    if updated.rows_affected() == 0 {
        return Ok(InsertOutcome::Skipped);
    }

    // Talents and awards cascade with the players.
    sqlx::query("DELETE FROM replays_players WHERE replay_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM events WHERE replay_id = ?")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    let players = &bundle.replay_players;
    insert_players(tx, id, players, &hero_ids, &player_ids).await?;
    insert_talents(tx, id, players, &hero_ids, &player_ids).await?;
    insert_awards(tx, id, players, &player_ids).await?;
    if replay.timestamp.timestamp() >= events_cutoff {
        insert_events(tx, id, &bundle.events).await?;
    }

    Ok(InsertOutcome::Refreshed(id))
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

async fn insert_replay(
    executor: impl SqliteExecutor<'_>,
    replay: &NewReplay,
    owner_hero_id: i64,
    owner_player_id: i64,
    owner_party_id: Option<i64>,
) -> sqlx::Result<i64> {
    sqlx::query(
        "INSERT INTO replays (hash, path, game_id, timestamp, mode, map, owner_hero_id,
             owner_player_id, owner_party_id, owner_win, duration, game_loops,
             gates_open_loop, is_new, ingest_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&replay.hash)
    .bind(&replay.path)
    .bind(&replay.game_id)
    .bind(replay.timestamp.timestamp())
    .bind(replay.mode)
    .bind(&replay.map)
    .bind(owner_hero_id)
    .bind(owner_player_id)
    .bind(owner_party_id)
    .bind(replay.owner_win)
    .bind(replay.duration)
    .bind(replay.game_loops)
    .bind(replay.gates_open_loop)
    .bind(replay.is_new)
    .bind(replay.ingest_version)
    .execute(executor)
    .await
    .map(|res| res.last_insert_rowid())
}

async fn insert_players(
    conn: &mut SqliteConnection,
    replay_id: i64,
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
            "INSERT INTO replays_players (replay_id, player_id, slot, team, hero_id,
                 time_dead_secs, time_on_fire_secs, upvotes, party, xp, score) ",
        )
        .push_values(chunk, |mut row, (player, player_id, hero_id)| {
            row.push_bind(replay_id)
                .push_bind(*player_id)
                .push_bind(player.slot)
                .push_bind(player.team)
                .push_bind(*hero_id)
                .push_bind(player.time_dead_secs)
                .push_bind(player.time_on_fire_secs)
                .push_bind(player.upvotes)
                .push_bind(player.party)
                .push("jsonb(")
                .push_bind_unseparated(player.xp.as_ref().map(Json))
                .push_unseparated(")")
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

async fn insert_talents(
    conn: &mut SqliteConnection,
    replay_id: i64,
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
            "INSERT INTO replays_players_talents (replay_id, player_id, tier, talent_id, gameloop) ",
        )
        .push_values(chunk, |mut row, (player_id, talent_id, talent)| {
            row.push_bind(replay_id)
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
    replay_id: i64,
    players: &[NewReplayPlayer],
    player_ids: &HashMap<String, i64>,
) -> sqlx::Result<()> {
    let mut awards: Vec<(i64, &str)> = Vec::new();
    for player in players {
        let player_id = id_of(player_ids, "player", &player.toon)?;
        awards.extend(
            player
                .awards
                .iter()
                .map(|award| (player_id, award.as_str())),
        );
    }
    for chunk in awards.chunks(chunk_rows(3)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO replays_players_awards (replay_id, player_id, award) ",
        )
        .push_values(chunk, |mut row, (player_id, award)| {
            row.push_bind(replay_id)
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
    replay_id: i64,
    events: &[NewEvent],
) -> sqlx::Result<()> {
    let kinds: BTreeSet<&str> = events.iter().map(|event| event.kind.as_str()).collect();
    let kind_ids = event_kinds::upsert_many(conn, &kinds).await?;
    let rows = events
        .iter()
        .map(|event| Ok((id_of(&kind_ids, "event kind", &event.kind)?, event)))
        .collect::<sqlx::Result<Vec<_>>>()?;
    for chunk in rows.chunks(chunk_rows(5)) {
        QueryBuilder::<Sqlite>::new(
            "INSERT INTO events (replay_id, kind_id, gameloop, team, data) ",
        )
        .push_values(chunk, |mut row, (kind_id, event)| {
            row.push_bind(replay_id)
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
    use crate::db::replays::{count, get_detail, HashStatus};
    use crate::db::test_utils::pool;
    use crate::types::player::Player;

    fn partied(name: &str, game_id: &str) -> NewReplayBundle {
        let mut game = bundle(name, 1000);
        game.replay.game_id = hex(game_id);
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
        solo.replay.game_id = hex("game c");
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
            game.replay.game_id = hex(name);
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

        let InsertOutcome::Replaced { removed, id } =
            insert_bundle(&pool, bundle("c", 2000)).await.unwrap()
        else {
            panic!("the longer replay should replace the stored one");
        };
        assert_eq!(removed, first);
        assert_eq!(count(&pool).await.unwrap(), 1);
        for hash in ["a", "b", "c"] {
            assert_ne!(
                status(&pool, hash).await,
                HashStatus::Unknown,
                "{hash} forgotten"
            );
        }

        let detail = get_detail(&pool, id, 0).await.unwrap().unwrap();
        assert_eq!(detail.replay.hash, hex("c"));
        assert_eq!(detail.players.len(), 1);
        assert_eq!(detail.players[0].awards.len(), 1);
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
            sqlx::query_scalar("SELECT typeof(data) FROM events WHERE replay_id = ?")
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
            replay.replay.game_id = hex(game);
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
}
