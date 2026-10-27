use sqlx::types::Json;
use sqlx::{FromRow, SqliteConnection, SqlitePool};

use super::detail::fetch_event_rows;
use crate::standouts::{GameData, StandoutsInput};
use crate::timeline;
use crate::types::hero::HeroRole;
use crate::types::timeline::XpBreakdown;

/// Games shorter than this say little about the player's usual.
const MIN_GAME_SECS: i64 = 600;

/// What a replay's standouts are computed from, or `Expired` when it was played
/// too long ago to keep its events.
pub enum StandoutsLoad {
    Expired,
    Ready(Box<StandoutsInput>),
}

#[derive(FromRow)]
struct CurrentRow {
    duration: i64,
    timestamp: i64,
    hero_id: i64,
    hero_slug: String,
    hero_role: Option<HeroRole>,
    owner_player_id: i64,
    owner_slot: i64,
    ally_team: i64,
    owner_time_dead: Option<f64>,
    owner_xp: Option<Json<XpBreakdown>>,
}

#[derive(FromRow)]
struct CandidateRow {
    id: i64,
    duration: i64,
    owner_slot: i64,
    ally_team: i64,
    owner_time_dead: Option<f64>,
    owner_xp: Option<Json<XpBreakdown>>,
}

/// Returns what the standouts of the replay `id` are computed from: the game itself
/// and the owner's last `limit` games on the same hero played since `events_cutoff`,
/// newest first, each with its timeline rebuilt from its stored events. `None` if
/// no replay has that id.
///
/// Everything is read from the same snapshot, like the detail.
pub async fn get_standouts_input(
    pool: &SqlitePool,
    id: i64,
    events_cutoff: i64,
    limit: i64,
) -> sqlx::Result<Option<StandoutsLoad>> {
    let mut tx = pool.begin().await?;
    let Some(current) = sqlx::query_as::<_, CurrentRow>(
        "SELECT r.duration, r.timestamp, r.owner_hero_id AS hero_id, r.owner_player_id,
             h.slug AS hero_slug, h.role AS hero_role,
             orp.slot AS owner_slot, orp.team AS ally_team,
             orp.time_dead_secs AS owner_time_dead, json(orp.xp) AS owner_xp
         FROM replays r
         JOIN heroes h ON h.id = r.owner_hero_id
         JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         WHERE r.id = ?",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    else {
        return Ok(None);
    };
    if current.timestamp < events_cutoff {
        return Ok(Some(StandoutsLoad::Expired));
    }

    let candidates = sqlx::query_as::<_, CandidateRow>(
        "SELECT r.id, r.duration, orp.slot AS owner_slot, orp.team AS ally_team,
             orp.time_dead_secs AS owner_time_dead, json(orp.xp) AS owner_xp
         FROM replays r
         JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         WHERE r.owner_hero_id = ? AND r.owner_player_id = ? AND r.id <> ?
             AND r.timestamp >= ? AND r.duration >= ?
         ORDER BY r.timestamp DESC, r.id DESC
         LIMIT ?",
    )
    .bind(current.hero_id)
    .bind(current.owner_player_id)
    .bind(id)
    .bind(events_cutoff)
    .bind(MIN_GAME_SECS)
    .bind(limit)
    .fetch_all(&mut *tx)
    .await?;

    let current_game = game_data(
        &mut tx,
        id,
        current.duration,
        current.owner_slot,
        current.ally_team,
        current.owner_time_dead,
        current.owner_xp,
    )
    .await?;
    let mut baseline = Vec::with_capacity(candidates.len());
    for row in candidates {
        baseline.push(
            game_data(
                &mut tx,
                row.id,
                row.duration,
                row.owner_slot,
                row.ally_team,
                row.owner_time_dead,
                row.owner_xp,
            )
            .await?,
        );
    }
    tx.commit().await?;

    Ok(Some(StandoutsLoad::Ready(Box::new(StandoutsInput {
        hero_slug: current.hero_slug,
        hero_role: current.hero_role,
        current: current_game,
        baseline,
    }))))
}

/// Reads one game's events back into the data the standout metrics judge.
async fn game_data(
    tx: &mut SqliteConnection,
    id: i64,
    duration: i64,
    owner_slot: i64,
    ally_team: i64,
    owner_time_dead: Option<f64>,
    owner_xp: Option<Json<XpBreakdown>>,
) -> sqlx::Result<GameData> {
    let events = fetch_event_rows(tx, id).await?;
    Ok(GameData {
        duration: duration as f64,
        owner_slot: u8::try_from(owner_slot).unwrap_or_default(),
        ally_team: u8::try_from(ally_team).unwrap_or_default(),
        owner_time_dead,
        owner_xp: owner_xp.map(|Json(xp)| xp),
        timeline: timeline::build(events, duration as f64),
    })
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;

    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::replays::InsertOutcome;
    use crate::db::test_utils::pool;
    use crate::types::hero::Hero;
    use crate::types::replay::NewReplayBundle;

    /// A game with one death event, lasting `game_loops / 16` seconds.
    fn game(game_id: &str, timestamp: i64, game_loops: i64) -> NewReplayBundle {
        let mut game = bundle(game_id, game_loops);
        game.replay.game_id = hex(game_id);
        game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
        game.events = vec![death()];
        game
    }

    async fn insert(pool: &SqlitePool, game: NewReplayBundle) -> i64 {
        let InsertOutcome::Inserted(id) = insert_bundle(pool, game).await.unwrap() else {
            panic!("the replay should be inserted");
        };
        id
    }

    async fn load(pool: &SqlitePool, id: i64, cutoff: i64) -> Option<StandoutsLoad> {
        get_standouts_input(pool, id, cutoff, 20).await.unwrap()
    }

    fn ready(load: Option<StandoutsLoad>) -> StandoutsInput {
        match load {
            Some(StandoutsLoad::Ready(input)) => *input,
            _ => panic!("the load should be ready"),
        }
    }

    #[tokio::test]
    async fn loads_the_game_and_its_baseline_newest_first() {
        let pool = pool().await;
        insert(&pool, game("oldest", 100, 16_000)).await;
        insert(&pool, game("newest", 300, 32_000)).await;
        let mut dead = game("middle", 200, 16_000);
        dead.replay_players[0].time_dead_secs = Some(42.0);
        dead.replay_players[0].xp = Some(serde_json::json!({ "minion": 150.0, "hero": 50.0 }));
        insert(&pool, dead).await;
        let current = insert(&pool, game("current", 400, 48_000)).await;

        let input = ready(load(&pool, current, 0).await);
        assert_eq!(input.current.duration, 3000.0);
        assert_eq!(input.current.owner_slot, 1);
        assert_eq!(input.current.ally_team, 0);
        assert_eq!(input.current.timeline.deaths.len(), 1);

        let durations: Vec<_> = input.baseline.iter().map(|g| g.duration).collect();
        assert_eq!(durations, [2000.0, 1000.0, 1000.0]);
        assert_eq!(input.baseline[1].owner_time_dead, Some(42.0));
        assert_eq!(input.baseline[0].owner_time_dead, None);
        assert_eq!(input.baseline[0].timeline.deaths.len(), 1);

        // A stored breakdown reads back with its missing keys defaulted.
        let xp = input.baseline[1].owner_xp.as_ref().unwrap();
        assert_eq!((xp.minion, xp.hero, xp.creep), (150.0, 50.0, 0.0));
        assert!(input.baseline[0].owner_xp.is_none());
    }

    #[tokio::test]
    async fn skips_expired_short_and_other_hero_baseline_games() {
        let pool = pool().await;
        insert(&pool, game("expired", 100, 16_000)).await;
        insert(&pool, game("short", 200, 8_000)).await;
        let mut other = game("other", 300, 16_000);
        other.replay.owner_hero_slug = "Tank".to_owned();
        other.replay_players[0].hero_slug = "Tank".to_owned();
        other.heroes.push(Hero {
            slug: "Tank".to_owned(),
            name: "Anub'arak".to_owned(),
        });
        insert(&pool, other).await;
        insert(&pool, game("kept", 300, 32_000)).await;
        let current = insert(&pool, game("current", 400, 16_000)).await;

        let input = ready(load(&pool, current, 150).await);
        let durations: Vec<_> = input.baseline.iter().map(|g| g.duration).collect();
        assert_eq!(durations, [2000.0]);
    }

    #[tokio::test]
    async fn flags_expired_and_missing_replays() {
        let pool = pool().await;
        let id = insert(&pool, game("old", 100, 16_000)).await;

        assert!(matches!(
            load(&pool, id, 200).await,
            Some(StandoutsLoad::Expired)
        ));
        assert!(load(&pool, id + 1, 0).await.is_none());
    }
}
