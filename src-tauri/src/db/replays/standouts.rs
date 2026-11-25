use sqlx::{FromRow, SqliteConnection, SqlitePool};

use super::detail::fetch_event_rows;
use crate::db::scope::Scope;
use crate::standouts::{GameData, StandoutsInput, LOST_VIKINGS};
use crate::timeline;
use crate::types::hero::HeroRole;

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
    owner_minion_damage: Option<f64>,
}

#[derive(FromRow)]
struct CandidateRow {
    id: i64,
    duration: i64,
    owner_slot: i64,
    ally_team: i64,
    owner_time_dead: Option<f64>,
    owner_minion_damage: Option<f64>,
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
    let mut query = Scope::career().owner_games(
        "SELECT r.duration, r.timestamp, r.owner_hero_id AS hero_id, r.owner_player_id,
             h.slug AS hero_slug, h.role AS hero_role,
             orp.slot AS owner_slot, orp.team AS ally_team,
             orp.time_dead_secs AS owner_time_dead,
             CAST(orp.minion_damage AS REAL) AS owner_minion_damage",
    );
    query
        .push(" JOIN heroes h ON h.id = r.owner_hero_id WHERE r.id = ")
        .push_bind(id);
    let Some(current) = query
        .build_query_as::<CurrentRow>()
        .fetch_optional(&mut *tx)
        .await?
    else {
        return Ok(None);
    };
    if current.timestamp < events_cutoff {
        return Ok(Some(StandoutsLoad::Expired));
    }

    // The baseline is the account's own usual, not the owner's other accounts'.
    let mut query = Scope::career().hero(current.hero_id).owner_games(
        "SELECT r.id, r.duration, orp.slot AS owner_slot, orp.team AS ally_team,
             orp.time_dead_secs AS owner_time_dead,
             CAST(orp.minion_damage AS REAL) AS owner_minion_damage",
    );
    query
        .push(" WHERE r.owner_player_id = ")
        .push_bind(current.owner_player_id)
        .push(" AND r.id <> ")
        .push_bind(id)
        .push(" AND r.timestamp >= ")
        .push_bind(events_cutoff)
        .push(" AND r.duration >= ")
        .push_bind(MIN_GAME_SECS)
        .push(" ORDER BY r.timestamp DESC, r.id DESC LIMIT ")
        .push_bind(limit);
    let candidates = query
        .build_query_as::<CandidateRow>()
        .fetch_all(&mut *tx)
        .await?;

    let current_game = game_data(
        &mut tx,
        id,
        current.duration,
        current.owner_slot,
        current.ally_team,
        current.owner_time_dead,
        current.owner_minion_damage,
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
                row.owner_minion_damage,
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
    owner_minion_damage: Option<f64>,
) -> sqlx::Result<GameData> {
    let events = fetch_event_rows(tx, id).await?;
    let vikings: Vec<i64> = sqlx::query_scalar(
        "SELECT rp.slot FROM games_players rp
         JOIN heroes h ON h.id = rp.hero_id
         WHERE rp.game_id = (SELECT game_id FROM replays WHERE id = ?) AND h.slug = ?",
    )
    .bind(id)
    .bind(LOST_VIKINGS)
    .fetch_all(&mut *tx)
    .await?;

    Ok(GameData {
        duration: duration as f64,
        owner_slot: u8::try_from(owner_slot).unwrap_or_default(),
        ally_team: u8::try_from(ally_team).unwrap_or_default(),
        owner_time_dead,
        owner_minion_damage,
        vikings: vikings
            .into_iter()
            .filter_map(|slot| u8::try_from(slot).ok())
            .collect(),
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
    use crate::types::replay::NewScore;

    /// A game with one death event, lasting `game_loops / 16` seconds.
    fn game(game_id: &str, timestamp: i64, game_loops: i64) -> NewReplayBundle {
        let mut game = bundle(game_id, game_loops);
        game.replay.game_key = hex(game_id);
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
        dead.replay_players[0].score = NewScore {
            minion_damage: Some(15000),
            ..Default::default()
        };
        insert(&pool, dead).await;
        let current = insert(&pool, game("current", 400, 48_000)).await;

        let input = ready(load(&pool, current, 0).await);
        assert_eq!(input.current.duration, 3000.0);
        assert_eq!(input.current.owner_slot, 1);
        assert_eq!(input.current.ally_team, 0);
        assert_eq!(input.current.timeline.deaths.len(), 1);
        assert!(input.current.vikings.is_empty());

        let durations: Vec<_> = input.baseline.iter().map(|g| g.duration).collect();
        assert_eq!(durations, [2000.0, 1000.0, 1000.0]);
        assert_eq!(input.baseline[1].owner_time_dead, Some(42.0));
        assert_eq!(input.baseline[0].owner_time_dead, None);
        assert_eq!(input.baseline[0].timeline.deaths.len(), 1);

        assert_eq!(input.baseline[1].owner_minion_damage, Some(15000.0));
        assert_eq!(input.baseline[0].owner_minion_damage, None);
    }

    #[tokio::test]
    async fn skips_expired_short_and_other_hero_baseline_games() {
        let pool = pool().await;
        insert(&pool, game("expired", 100, 16_000)).await;
        insert(&pool, game("short", 200, 8_000)).await;
        let mut other = game("other", 300, 16_000);
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
    async fn reads_the_vikings_slots() {
        let pool = pool().await;
        let mut vikings = game("vikings", 100, 16_000);
        vikings.replay_players[0].hero_slug = LOST_VIKINGS.to_owned();
        vikings.heroes.push(Hero {
            slug: LOST_VIKINGS.to_owned(),
            name: "The Lost Vikings".to_owned(),
        });
        let id = insert(&pool, vikings).await;

        let input = ready(load(&pool, id, 0).await);
        assert_eq!(input.current.vikings, [1]);
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
