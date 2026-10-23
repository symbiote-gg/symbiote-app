use std::collections::{BTreeSet, HashMap};

use hots_replay_parser::summary::LOOPS_PER_SECOND;
use sqlx::types::Json;
use sqlx::{
    Connection, FromRow, QueryBuilder, Sqlite, SqliteConnection, SqliteExecutor, SqlitePool,
};

use super::{chunk_rows, event_kinds, heroes, parties, players, talents};
use crate::types::replay::{
    AwardInfo, NewEvent, NewReplay, NewReplayBundle, NewReplayPlayer, NewTalent, ReplayCursor,
    ReplayDetail, ReplayPage, ReplayPlayerDetail, ReplayPlayerInfo, ReplayWithPlayers, TalentPick,
    XpSample,
};
use crate::types::timeline::RawEvent;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InsertOutcome {
    Inserted(i64),
    Replaced { removed: i64, id: i64 },
    Refreshed(i64),
    Skipped,
}

/// What is stored for a replay file's content.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HashStatus {
    Unknown,
    /// Stored at the current ingest version, or superseded by a longer replay.
    Current,
    /// Stored at an older ingest version, as the replay with this id.
    Stale(i64),
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
/// Heroes, players and the owner's party are upserted first, since the replay rows
/// reference them.
///
/// They share one transaction to save a commit per replay, each in its own savepoint so
/// one that fails leaves the others stored. Returns each replay's outcome, in order.
pub async fn insert_bundles(
    pool: &SqlitePool,
    bundles: Vec<NewReplayBundle>,
) -> sqlx::Result<Vec<sqlx::Result<InsertOutcome>>> {
    let mut tx = pool.begin().await?;
    let mut outcomes = Vec::with_capacity(bundles.len());

    for bundle in bundles {
        let mut savepoint = tx.begin().await?;
        let outcome = match bundle.refreshes {
            Some(id) => refresh_bundle_in(&mut savepoint, id, bundle).await,
            None => insert_bundle_in(&mut savepoint, bundle).await,
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
    insert_events(tx, replay_id, &bundle.events).await?;
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
    insert_events(tx, id, &bundle.events).await?;

    Ok(InsertOutcome::Refreshed(id))
}

/// Looks up what is stored for `hash`, a replay being stale below ingest `version`.
pub async fn hash_status(pool: &SqlitePool, hash: &str, version: i64) -> sqlx::Result<HashStatus> {
    let stored: Option<(i64, i64)> =
        sqlx::query_as("SELECT id, ingest_version FROM replays WHERE hash = ?")
            .bind(hash)
            .fetch_optional(pool)
            .await?;
    if let Some((id, stored_version)) = stored {
        return Ok(if stored_version < version {
            HashStatus::Stale(id)
        } else {
            HashStatus::Current
        });
    }

    let superseded: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM superseded_replays WHERE hash = ?)")
            .bind(hash)
            .fetch_one(pool)
            .await?;
    Ok(if superseded {
        HashStatus::Current
    } else {
        HashStatus::Unknown
    })
}

/// Lists the paths of the replays stored below ingest `version`, newest first.
pub async fn list_stale_paths(pool: &SqlitePool, version: i64) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar(
        "SELECT path FROM replays WHERE ingest_version < ?
         ORDER BY timestamp DESC, id DESC",
    )
    .bind(version)
    .fetch_all(pool)
    .await
}

pub async fn list_known_paths(pool: &SqlitePool) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar("SELECT path FROM replays UNION ALL SELECT path FROM superseded_replays")
        .fetch_all(pool)
        .await
}

/// Prunes the superseded files whose path isn't in `existing_paths`, i.e. the ones
/// deleted from disk since they were recorded.
pub async fn prune_superseded(pool: &SqlitePool, existing_paths: &[String]) -> sqlx::Result<u64> {
    let paths =
        serde_json::to_string(existing_paths).map_err(|e| sqlx::Error::Encode(Box::new(e)))?;
    sqlx::query(
        "DELETE FROM superseded_replays
         WHERE path NOT IN (SELECT value FROM json_each(?))",
    )
    .bind(paths)
    .execute(pool)
    .await
    .map(|res| res.rows_affected())
}

pub async fn mark_seen(pool: &SqlitePool, id: i64) -> sqlx::Result<()> {
    sqlx::query("UPDATE replays SET is_new = 0 WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn count(executor: impl SqliteExecutor<'_>) -> sqlx::Result<i64> {
    sqlx::query_scalar("SELECT COUNT(*) FROM replays")
        .fetch_one(executor)
        .await
}

/// Returns a page of replays, newest first, with the total count, both read from the
/// same snapshot so a replay ingested meanwhile can't make them disagree.
pub async fn list_page(
    pool: &SqlitePool,
    after: Option<ReplayCursor>,
    limit: i64,
) -> sqlx::Result<ReplayPage> {
    let mut tx = pool.begin().await?;
    let replays = list_with_players(&mut tx, after, limit).await?;
    let total = count(&mut *tx).await?;
    tx.commit().await?;
    Ok(ReplayPage { replays, total })
}

/// Games the owner needs on a hero before any of them counts as a top damage game.
const TOP_DAMAGE_MIN_GAMES: i64 = 10;
/// Percent rank among the owner's games on a hero from which hero damage counts as top.
const TOP_DAMAGE_RANK: f64 = 0.9;

/// Builds the query listing each replay picked by `source`, a subquery over `replays`,
/// with its owner's hero and stats, newest first.
///
/// Hero damage is ranked against all of the owner's games on the same hero, not only
/// the listed ones.
fn list_rows_sql(source: &str) -> String {
    format!(
        "SELECT r.id, r.hash, r.path, r.ingest_date, r.timestamp, r.mode, r.map, r.owner_hero_id,
             COALESCE(m.name, r.map) AS map_name, m.loading_screen AS map_loading_screen,
             r.owner_player_id, r.owner_win,
             r.duration, r.is_new, h.name AS hero_name, h.role AS hero_role,
             h.portrait AS hero_portrait,
             json_extract(orp.score, '$.SoloKill') AS owner_kills,
             json_extract(orp.score, '$.Deaths') AS owner_deaths,
             json_extract(orp.score, '$.Assists') AS owner_assists,
             json_extract(orp.score, '$.Takedowns') AS owner_takedowns,
             json_extract(orp.score, '$.HeroDamage') AS owner_hero_damage,
             COALESCE(dr.hero_games >= {TOP_DAMAGE_MIN_GAMES}
                 AND dr.damage_rank >= {TOP_DAMAGE_RANK}, 0) AS owner_hero_damage_top
         FROM ({source}) r
         JOIN heroes h ON h.id = r.owner_hero_id
         LEFT JOIN maps m ON m.id = r.map
         LEFT JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         LEFT JOIN (
             SELECT hr.id,
                 PERCENT_RANK() OVER (PARTITION BY hr.owner_hero_id
                     ORDER BY json_extract(hrp.score, '$.HeroDamage')) AS damage_rank,
                 COUNT(*) OVER (PARTITION BY hr.owner_hero_id) AS hero_games
             FROM replays hr
             JOIN replays_players hrp
                 ON hrp.replay_id = hr.id AND hrp.player_id = hr.owner_player_id
             WHERE json_extract(hrp.score, '$.HeroDamage') IS NOT NULL
         ) dr ON dr.id = r.id
         ORDER BY r.timestamp DESC, r.id DESC"
    )
}

/// Returns a page of replays, newest first, each with its owner's hero, stats and players.
///
/// Pages by position rather than offset, so a replay ingested between two pages can't
/// shift the second one and repeat a replay of the first.
async fn list_with_players(
    conn: &mut SqliteConnection,
    after: Option<ReplayCursor>,
    limit: i64,
) -> sqlx::Result<Vec<ReplayWithPlayers>> {
    let mut replays = match after {
        Some(cursor) => {
            let sql = list_rows_sql(
                "SELECT * FROM replays WHERE (timestamp, id) < (?, ?)
                 ORDER BY timestamp DESC, id DESC LIMIT ?",
            );
            sqlx::query_as::<_, ReplayWithPlayers>(&sql)
                .bind(cursor.timestamp.timestamp())
                .bind(cursor.id)
                .bind(limit)
                .fetch_all(&mut *conn)
                .await?
        }
        None => {
            let sql =
                list_rows_sql("SELECT * FROM replays ORDER BY timestamp DESC, id DESC LIMIT ?");
            sqlx::query_as::<_, ReplayWithPlayers>(&sql)
                .bind(limit)
                .fetch_all(&mut *conn)
                .await?
        }
    };
    attach_players(conn, &mut replays).await?;
    attach_owner_awards(conn, &mut replays).await?;
    Ok(replays)
}

/// Returns a replay as listed by [`list_page`], or `None` if it doesn't exist.
pub async fn get_list_row(pool: &SqlitePool, id: i64) -> sqlx::Result<Option<ReplayWithPlayers>> {
    let sql = list_rows_sql("SELECT * FROM replays WHERE id = ?");
    let mut conn = pool.acquire().await?;
    let mut replays = sqlx::query_as::<_, ReplayWithPlayers>(&sql)
        .bind(id)
        .fetch_all(&mut *conn)
        .await?;
    attach_players(&mut conn, &mut replays).await?;
    attach_owner_awards(&mut conn, &mut replays).await?;
    Ok(replays.pop())
}

#[derive(FromRow)]
struct ReplayPlayerInfoRow {
    replay_id: i64,
    #[sqlx(flatten)]
    player: ReplayPlayerInfo,
}

/// Fills in each replay's players, by slot.
async fn attach_players(
    conn: &mut SqliteConnection,
    replays: &mut [ReplayWithPlayers],
) -> sqlx::Result<()> {
    if replays.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Sqlite>::new(
        "SELECT rp.replay_id, rp.player_id, p.name, rp.slot, rp.team, rp.hero_id,
             h.name AS hero_name, h.portrait AS hero_portrait
         FROM replays_players rp
         JOIN players p ON p.id = rp.player_id
         JOIN heroes h ON h.id = rp.hero_id
         WHERE rp.replay_id IN (",
    );
    let mut ids = query.separated(", ");
    for replay in replays.iter() {
        ids.push_bind(replay.replay.id);
    }
    ids.push_unseparated(") ORDER BY rp.slot");
    let rows = query
        .build_query_as::<ReplayPlayerInfoRow>()
        .fetch_all(&mut *conn)
        .await?;
    for row in rows {
        if let Some(replay) = replays.iter_mut().find(|r| r.replay.id == row.replay_id) {
            replay.players.push(row.player);
        }
    }
    Ok(())
}

#[derive(FromRow)]
struct ReplayAwardRow {
    replay_id: i64,
    #[sqlx(flatten)]
    award: AwardInfo,
}

/// Fills in the awards each replay's owner got, MVP first.
async fn attach_owner_awards(
    conn: &mut SqliteConnection,
    replays: &mut [ReplayWithPlayers],
) -> sqlx::Result<()> {
    if replays.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Sqlite>::new(
        "SELECT rpa.replay_id, rpa.award, a.name, a.description, a.icon
         FROM replays_players_awards rpa
         JOIN replays r ON r.id = rpa.replay_id AND r.owner_player_id = rpa.player_id
         LEFT JOIN awards a ON a.id = rpa.award
         WHERE rpa.replay_id IN (",
    );
    let mut ids = query.separated(", ");
    for replay in replays.iter() {
        ids.push_bind(replay.replay.id);
    }
    ids.push_unseparated(") ORDER BY rpa.award = 'mvp' DESC, rpa.award");
    let rows = query
        .build_query_as::<ReplayAwardRow>()
        .fetch_all(&mut *conn)
        .await?;
    for row in rows {
        if let Some(replay) = replays.iter_mut().find(|r| r.replay.id == row.replay_id) {
            replay.owner_awards.push(row.award);
        }
    }
    Ok(())
}

#[derive(FromRow)]
struct PlayerTalentRow {
    player_id: i64,
    #[sqlx(flatten)]
    talent: TalentPick,
}

#[derive(FromRow)]
struct PlayerAwardRow {
    player_id: i64,
    #[sqlx(flatten)]
    award: AwardInfo,
}

/// Returns the full detail of a replay, or `None` if it doesn't exist.
///
/// Event and XP times are in seconds relative to the gates opening. Everything is read
/// from the same snapshot, so a replay replaced meanwhile can't come back half-read.
pub async fn get_detail(pool: &SqlitePool, id: i64) -> sqlx::Result<Option<ReplayDetail>> {
    let mut tx = pool.begin().await?;
    let Some(mut detail) = sqlx::query_as::<_, ReplayDetail>(
        "SELECT r.id, r.hash, r.path, r.ingest_date, r.timestamp, r.mode, r.map, r.owner_hero_id,
             COALESCE(m.name, r.map) AS map_name, m.loading_screen AS map_loading_screen,
             r.owner_player_id, r.owner_win,
             r.duration, r.is_new, h.name AS hero_name, h.role AS hero_role,
             h.portrait AS hero_portrait
         FROM replays r
         JOIN heroes h ON h.id = r.owner_hero_id
         LEFT JOIN maps m ON m.id = r.map
         WHERE r.id = ?",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    else {
        return Ok(None);
    };

    detail.players = sqlx::query_as::<_, ReplayPlayerDetail>(
        "SELECT rp.player_id, p.name, rp.slot, rp.team, rp.hero_id, h.name AS hero_name,
             h.portrait AS hero_portrait,
             json_extract(rp.score, '$.SoloKill') AS kills,
             json_extract(rp.score, '$.Assists') AS assists,
             json_extract(rp.score, '$.Deaths') AS deaths,
             json_extract(rp.score, '$.HeroDamage') AS hero_damage,
             json_extract(rp.score, '$.SiegeDamage') AS siege_damage,
             json_extract(rp.score, '$.Healing') AS healing,
             json_extract(rp.score, '$.SelfHealing') AS self_healing,
             json_extract(rp.score, '$.DamageTaken') AS damage_taken,
             json_extract(rp.score, '$.ExperienceContribution') AS xp,
             rp.time_dead_secs AS time_dead, rp.upvotes, rp.party
         FROM replays_players rp
         JOIN players p ON p.id = rp.player_id
         JOIN heroes h ON h.id = rp.hero_id
         WHERE rp.replay_id = ?
         ORDER BY rp.slot",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    let talents = sqlx::query_as::<_, PlayerTalentRow>(
        "SELECT rpt.player_id, rpt.tier, rpt.talent_id, t.slug, rpt.gameloop, t.name,
             t.description, t.icon
         FROM replays_players_talents rpt
         JOIN talents t ON t.id = rpt.talent_id
         WHERE rpt.replay_id = ?
         ORDER BY rpt.tier",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    let awards = sqlx::query_as::<_, PlayerAwardRow>(
        "SELECT rpa.player_id, rpa.award, a.name, a.description, a.icon
         FROM replays_players_awards rpa
         LEFT JOIN awards a ON a.id = rpa.award
         WHERE rpa.replay_id = ?
         ORDER BY rpa.award = 'mvp' DESC, rpa.award",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    let events = sqlx::query_as::<_, RawEvent>(
        "SELECT k.name AS kind, CAST(e.gameloop - r.gates_open_loop AS REAL) / ? AS time,
             e.team, json(e.data) AS data
         FROM events e
         JOIN replays r ON r.id = e.replay_id
         JOIN event_kinds k ON k.id = e.kind_id
         WHERE e.replay_id = ? AND k.name != 'xp'
         ORDER BY e.gameloop, e.id",
    )
    .bind(LOOPS_PER_SECOND)
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    detail.xp = sqlx::query_as::<_, XpSample>(
        "SELECT CAST(e.gameloop - r.gates_open_loop AS REAL) / ? AS time,
             CAST(e.team AS INTEGER) AS team,
             CAST(json_extract(e.data, '$.team_level') AS INTEGER) AS level,
             CAST(json_extract(e.data, '$.xp.minion') + json_extract(e.data, '$.xp.creep')
                 + json_extract(e.data, '$.xp.structure') + json_extract(e.data, '$.xp.hero')
                 + json_extract(e.data, '$.xp.trickle') AS REAL) AS total
         FROM events e
         JOIN replays r ON r.id = e.replay_id
         JOIN event_kinds k ON k.id = e.kind_id
         WHERE e.replay_id = ? AND k.name = 'xp'
         ORDER BY e.gameloop, e.team",
    )
    .bind(LOOPS_PER_SECOND)
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;

    detail.timeline = crate::timeline::build(events);
    for row in talents {
        if let Some(player) = detail
            .players
            .iter_mut()
            .find(|p| p.player_id == row.player_id)
        {
            player.talents.push(row.talent);
        }
    }
    for row in awards {
        if let Some(player) = detail
            .players
            .iter_mut()
            .find(|p| p.player_id == row.player_id)
        {
            player.awards.push(row.award);
        }
    }

    Ok(Some(detail))
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
                 time_dead_secs, upvotes, party, xp, score) ",
        )
        .push_values(chunk, |mut row, (player, player_id, hero_id)| {
            row.push_bind(replay_id)
                .push_bind(*player_id)
                .push_bind(player.slot)
                .push_bind(player.team)
                .push_bind(*hero_id)
                .push_bind(player.time_dead_secs)
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
    use chrono::DateTime;
    use sha2::{Digest, Sha256};
    use sqlx::sqlite::SqlitePoolOptions;

    use super::*;
    use crate::ingester::INGEST_VERSION;
    use crate::types::hero::Hero;
    use crate::types::player::Player;
    use crate::types::replay::Mode;

    async fn insert_bundle(
        pool: &SqlitePool,
        bundle: NewReplayBundle,
    ) -> sqlx::Result<InsertOutcome> {
        insert_bundles(pool, vec![bundle]).await?.remove(0)
    }

    fn hex(name: &str) -> String {
        format!("{:x}", Sha256::digest(name))
    }

    async fn status(pool: &SqlitePool, name: &str) -> HashStatus {
        hash_status(pool, &hex(name), INGEST_VERSION).await.unwrap()
    }

    async fn pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    fn bundle(name: &str, game_loops: i64) -> NewReplayBundle {
        NewReplayBundle {
            replay: NewReplay {
                hash: hex(name),
                path: format!("{name}.StormReplay"),
                game_id: hex("game"),
                timestamp: DateTime::from_timestamp(1_700_000_000, 0).unwrap(),
                mode: Mode::QuickMatch,
                map: "cursed_hollow".to_owned(),
                owner_hero_slug: "Wizard".to_owned(),
                owner_toon: "owner".to_owned(),
                owner_win: Some(true),
                duration: game_loops / 16,
                game_loops,
                gates_open_loop: 0,
                is_new: false,
                ingest_version: INGEST_VERSION,
            },
            heroes: vec![Hero {
                slug: "Wizard".to_owned(),
                name: "Li-Ming".to_owned(),
            }],
            players: vec![Player {
                toon: "owner".to_owned(),
                name: "Owner".to_owned(),
                account_level: None,
            }],
            replay_players: vec![NewReplayPlayer {
                toon: "owner".to_owned(),
                slot: 1,
                team: 0,
                hero_slug: "Wizard".to_owned(),
                time_dead_secs: None,
                upvotes: 0,
                party: None,
                xp: None,
                score: serde_json::json!({}),
                talents: vec![],
                awards: vec!["mvp".to_owned()],
            }],
            events: vec![],
            owner_party: vec![],
            refreshes: None,
        }
    }

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

        let detail = get_detail(&pool, id).await.unwrap().unwrap();
        assert_eq!(detail.replay.hash, hex("c"));
        assert_eq!(detail.players.len(), 1);
        assert_eq!(detail.players[0].awards.len(), 1);
    }

    #[tokio::test]
    async fn refreshes_a_stale_replay_in_place() {
        let pool = pool().await;
        let mut stale = bundle("a", 1000);
        stale.replay.ingest_version = INGEST_VERSION - 1;
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
                "alone": true,
            }),
        }];
        fresh.refreshes = Some(id);
        let outcome = insert_bundle(&pool, fresh).await.unwrap();
        assert_eq!(outcome, InsertOutcome::Refreshed(id));
        assert_eq!(status(&pool, "a").await, HashStatus::Current);
        assert_eq!(status(&pool, "b").await, HashStatus::Current);
        assert!(owner_party_id(&pool, "a").await.is_some());

        let detail = get_detail(&pool, id).await.unwrap().unwrap();
        assert_eq!(detail.replay.path, "moved/a.StormReplay");
        assert!(detail.replay.is_new);
        assert!(detail.players[0].awards.is_empty());
        assert_eq!(detail.timeline.deaths.len(), 1);
        assert_eq!(detail.timeline.deaths[0].alone, Some(true));

        let kind: String =
            sqlx::query_scalar("SELECT typeof(data) FROM events WHERE replay_id = ?")
                .bind(id)
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(kind, "blob");
    }

    #[tokio::test]
    async fn lists_stale_paths_newest_first() {
        let pool = pool().await;
        for (hash, timestamp, version) in [
            ("old", 100, INGEST_VERSION - 1),
            ("new", 200, INGEST_VERSION - 1),
            ("current", 300, INGEST_VERSION),
        ] {
            let mut game = bundle(hash, 1000);
            game.replay.game_id = hex(hash);
            game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
            game.replay.ingest_version = version;
            insert_bundle(&pool, game).await.unwrap();
        }

        let paths = list_stale_paths(&pool, INGEST_VERSION).await.unwrap();
        assert_eq!(paths, ["new.StormReplay", "old.StormReplay"]);
    }

    async fn insert_game(pool: &SqlitePool, game_id: &str, timestamp: i64) {
        let mut game = bundle(game_id, 1000);
        game.replay.game_id = hex(game_id);
        game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
        insert_bundle(pool, game).await.unwrap();
    }

    fn cursor(replay: &ReplayWithPlayers) -> ReplayCursor {
        ReplayCursor {
            timestamp: replay.replay.timestamp,
            id: replay.replay.id,
        }
    }

    fn hashes(page: &ReplayPage) -> Vec<&str> {
        page.replays
            .iter()
            .map(|r| r.replay.hash.as_str())
            .collect()
    }

    #[tokio::test]
    async fn pages_from_the_last_listed_replay() {
        let pool = pool().await;
        insert_game(&pool, "a", 300).await;
        insert_game(&pool, "b", 200).await;
        insert_game(&pool, "c", 200).await;
        insert_game(&pool, "d", 100).await;

        let first = list_page(&pool, None, 2).await.unwrap();
        assert_eq!(hashes(&first), [hex("a"), hex("c")]);

        // A newer replay ingested between pages must not shift the next one.
        insert_game(&pool, "e", 400).await;
        let second = list_page(&pool, Some(cursor(&first.replays[1])), 2)
            .await
            .unwrap();
        assert_eq!(hashes(&second), [hex("b"), hex("d")]);
        assert_eq!(second.total, 5);
    }

    #[tokio::test]
    async fn detail_joins_the_map_and_player_stats() {
        let pool = pool().await;
        sqlx::query("INSERT INTO maps (id, name, loading_screen) VALUES ('cursed_hollow', 'Cursed Hollow', 'ch.webp')")
            .execute(&pool)
            .await
            .unwrap();
        let mut known = bundle("a", 1000);
        known.replay_players[0].score = serde_json::json!({ "SoloKill": 7, "HeroDamage": 70100, "DamageTaken": 52300, "SelfHealing": 8400 });
        known.replay_players[0].upvotes = 3;
        known.replay_players[0].party = Some(2);
        let InsertOutcome::Inserted(known) = insert_bundle(&pool, known).await.unwrap() else {
            panic!("the replay should be inserted");
        };
        let mut unknown = bundle("b", 1000);
        unknown.replay.game_id = hex("other");
        unknown.replay.map = "New Map".to_owned();
        let InsertOutcome::Inserted(unknown) = insert_bundle(&pool, unknown).await.unwrap() else {
            panic!("the replay should be inserted");
        };

        let detail = get_detail(&pool, known).await.unwrap().unwrap();
        assert_eq!(detail.replay.map_name, "Cursed Hollow");
        assert_eq!(detail.replay.map_loading_screen.as_deref(), Some("ch.webp"));
        assert_eq!(detail.players[0].kills, Some(7));
        assert_eq!(detail.players[0].hero_damage, Some(70100));
        assert_eq!(detail.players[0].healing, None);
        assert_eq!(detail.players[0].damage_taken, Some(52300));
        assert_eq!(detail.players[0].self_healing, Some(8400));
        assert_eq!(detail.players[0].upvotes, 3);
        assert_eq!(detail.players[0].party, Some(2));

        let row = get_list_row(&pool, unknown).await.unwrap().unwrap();
        assert_eq!(row.replay.map_name, "New Map");
        assert_eq!(row.replay.map_loading_screen, None);
        assert_eq!(row.players[0].hero_name, "Li-Ming");
        assert_eq!(row.players[0].hero_portrait, None);
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

        let first = get_detail(&pool, ids[0]).await.unwrap().unwrap();
        let second = get_detail(&pool, ids[1]).await.unwrap().unwrap();
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

    async fn insert_damage_game(pool: &SqlitePool, game_id: &str, hero_damage: i64) {
        let mut game = bundle(game_id, 1000);
        game.replay.game_id = hex(game_id);
        game.replay_players[0].score = serde_json::json!({ "HeroDamage": hero_damage });
        game.replay_players[0].awards = vec!["mvp".to_owned(), "escape_artist".to_owned()];
        insert_bundle(pool, game).await.unwrap();
    }

    fn top_damage_hashes(page: &ReplayPage) -> Vec<&str> {
        page.replays
            .iter()
            .filter(|r| r.owner_stats.owner_hero_damage_top)
            .map(|r| r.replay.hash.as_str())
            .collect()
    }

    #[tokio::test]
    async fn lists_owner_awards_and_top_damage_games() {
        let pool = pool().await;
        for game in 1..TOP_DAMAGE_MIN_GAMES {
            insert_damage_game(&pool, &format!("g{game}"), game * 1000).await;
        }

        let page = list_page(&pool, None, 50).await.unwrap();
        assert!(top_damage_hashes(&page).is_empty(), "too few games to rank");
        let awards: Vec<&str> = page.replays[0]
            .owner_awards
            .iter()
            .map(|a| a.award.as_str())
            .collect();
        assert_eq!(awards, ["mvp", "escape_artist"]);

        insert_damage_game(&pool, "best", 100_000).await;
        let page = list_page(&pool, None, 50).await.unwrap();
        assert_eq!(top_damage_hashes(&page), [hex("best")]);
    }
}
