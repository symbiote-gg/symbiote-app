use chrono::DateTime;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

use crate::db::heroes;
use crate::db::replays::test_utils::{bundle, hex};
use crate::types::hero::{Hero, HeroFact};
use crate::types::player::Player;
use crate::types::replay::{Mode, NewReplayBundle, NewReplayPlayer, NewScore};

/// An empty in-memory database with the migrations run.
pub async fn pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

/// Like [`pool`], with the bundled hero facts, so heroes have their roles.
pub async fn seeded_pool() -> SqlitePool {
    let pool = pool().await;
    heroes::seed(&pool, &HeroFact::bundled().unwrap())
        .await
        .unwrap();
    pool
}

/// A tank, bruiser, ranged assassin, melee assassin and healer per team, team 0 first.
const ROSTER: [&str; 10] = [
    "Muradin",
    "Barbarian",
    "Wizard",
    "Zeratul",
    "Uther",
    "Crusader",
    "Artanis",
    "DemonHunter",
    "Jaina",
    "Malfurion",
];

const OWNER_INDEX: usize = 2;

/// A replay of a twenty minute Storm League game that "owner" won on team 0 against
/// nine players with full scoreboards, each player's line different.
pub struct GameBuilder(NewReplayBundle);

impl GameBuilder {
    pub fn new(name: &str) -> Self {
        let mut game = bundle(name, 0);
        game.replay.game_key = hex(name);
        game.replay.mode = Mode::StormLeague;
        game.heroes = ROSTER
            .iter()
            .map(|&slug| Hero {
                slug: slug.to_owned(),
                name: slug.to_owned(),
            })
            .collect();
        game.players = (0..ROSTER.len())
            .map(|index| Player {
                toon: toon(index),
                name: toon(index),
                account_level: None,
            })
            .collect();
        game.replay_players = ROSTER
            .iter()
            .enumerate()
            .map(|(index, &hero)| player(index, hero))
            .collect();

        Self(game).minutes(20)
    }

    pub fn at(mut self, timestamp: i64) -> Self {
        self.0.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
        self
    }

    pub fn mode(mut self, mode: Mode) -> Self {
        self.0.replay.mode = mode;
        self
    }

    pub fn secs(mut self, secs: i64) -> Self {
        self.0.replay.game_loops = secs * 16;
        self.0.replay.duration = secs;
        self
    }

    pub fn minutes(self, minutes: i64) -> Self {
        self.secs(minutes * 60)
    }

    /// Swaps the owner's hero for `slug`.
    pub fn owner_hero(mut self, slug: &str) -> Self {
        self.0.heroes[OWNER_INDEX] = Hero {
            slug: slug.to_owned(),
            name: slug.to_owned(),
        };
        self.0.replay_players[OWNER_INDEX].hero_slug = slug.to_owned();
        self
    }

    /// Makes this the file of `game` recorded by the player at `index` of the roster,
    /// another of the owner's accounts.
    pub fn recorded_by(mut self, game: &str, index: usize) -> Self {
        self.0.replay.game_key = hex(game);
        self.0.replay.owner_toon = toon(index);
        self
    }

    pub fn build(self) -> NewReplayBundle {
        self.0
    }
}

fn toon(index: usize) -> String {
    if index == OWNER_INDEX {
        "owner".to_owned()
    } else {
        format!("player-{index}")
    }
}

fn player(index: usize, hero: &str) -> NewReplayPlayer {
    let n = index as i64 + 1;
    let healer = matches!(hero, "Uther" | "Malfurion");

    NewReplayPlayer {
        toon: toon(index),
        slot: n,
        team: if index < 5 { 0 } else { 1 },
        hero_slug: hero.to_owned(),
        time_dead_secs: Some(20.0 * n as f64),
        time_on_fire_secs: None,
        upvotes: 0,
        party: None,
        xp: None,
        score: NewScore {
            kills: Some(n),
            deaths: Some(1 + n % 4),
            assists: Some(2 * n),
            takedowns: Some(3 * n),
            hero_damage: Some(20_000 + 3_000 * n),
            siege_damage: Some(40_000 + 2_000 * n),
            minion_damage: Some(15_000 + 1_000 * n),
            healing: healer.then_some(50_000 + 1_000 * n),
            self_healing: Some(5_000 + 500 * n),
            damage_taken: Some(25_000 + 4_000 * n),
            teamfight_damage_taken: Some(15_000 + 2_000 * n),
            teamfight_hero_damage: Some(12_000 + 2_000 * n),
            xp_contribution: Some(10_000 + 500 * n),
            time_stunning: Some(5 * n),
            time_rooting: None,
            time_silencing: None,
            protection: Some(1_000 * n),
            regen_globes: Some(n),
            merc_camp_captures: Some(n % 3),
        },
        talents: vec![],
        awards: vec![],
    }
}
