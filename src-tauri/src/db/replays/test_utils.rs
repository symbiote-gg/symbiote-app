use chrono::DateTime;
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

use super::{hash_status, insert_bundles, HashStatus, InsertOutcome};
use crate::types::hero::Hero;
use crate::types::player::Player;
use crate::types::replay::{Mode, NewEvent, NewReplay, NewReplayBundle, NewReplayPlayer};

/// The ingest version replays are stored at; a stale one is stored below it. It differs
/// from the real [`INGEST_VERSION`](crate::ingester::INGEST_VERSION), so behavior that
/// depends on the live value must be tested against that constant instead.
pub const VERSION: i64 = 1;

pub async fn insert_bundle(
    pool: &SqlitePool,
    bundle: NewReplayBundle,
) -> sqlx::Result<InsertOutcome> {
    insert_bundles(pool, vec![bundle], 0).await?.remove(0)
}

pub fn hex(name: &str) -> String {
    format!("{:x}", Sha256::digest(name))
}

pub async fn status(pool: &SqlitePool, name: &str) -> HashStatus {
    hash_status(pool, &hex(name), VERSION).await.unwrap()
}

/// A replay of a Li-Ming game by "owner" alone, with an MVP award.
pub fn bundle(name: &str, game_loops: i64) -> NewReplayBundle {
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
            ingest_version: VERSION,
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
            time_on_fire_secs: None,
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

pub async fn insert_game(pool: &SqlitePool, game_id: &str, timestamp: i64) {
    let mut game = bundle(game_id, 1000);
    game.replay.game_id = hex(game_id);
    game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
    insert_bundle(pool, game).await.unwrap();
}

pub fn death() -> NewEvent {
    NewEvent {
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
    }
}

pub fn game_with_events(game_id: &str, timestamp: i64) -> NewReplayBundle {
    let mut game = bundle(game_id, 1000);
    game.replay.game_id = hex(game_id);
    game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
    game.events = vec![death()];
    game
}

pub async fn event_count(pool: &SqlitePool, id: i64) -> i64 {
    sqlx::query_scalar("SELECT COUNT(*) FROM events WHERE replay_id = ?")
        .bind(id)
        .fetch_one(pool)
        .await
        .unwrap()
}
