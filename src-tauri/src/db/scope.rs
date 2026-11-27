//! The owner's games a card reads, narrowed by mode, hero and when they ended.

use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Sqlite};

use crate::types::replay::Mode;
use crate::types::stats::ScoreScope;

/// Which of the owner's games a query reads. Every game is in scope until narrowed.
#[derive(Debug, Clone, Copy, Default)]
pub struct Scope {
    modes: Option<&'static [Mode]>,
    hero_id: Option<i64>,
    ended_since: Option<i64>,
}

impl Scope {
    pub fn career() -> Self {
        Self::default()
    }

    pub fn of(scope: ScoreScope) -> Self {
        Self {
            modes: Some(scope.modes()),
            ..Self::default()
        }
    }

    pub fn hero(self, hero_id: i64) -> Self {
        Self {
            hero_id: Some(hero_id),
            ..self
        }
    }

    /// Keeps the games ended at or after `start`, so a game still running when the
    /// session began counts toward it.
    pub fn ended_since(self, start: DateTime<Utc>) -> Self {
        Self {
            ended_since: Some(start.timestamp()),
            ..self
        }
    }

    /// The condition [`Scope::ended_since`] keeps games by, over `r`, for counting a
    /// window's games beside the rest in one query.
    pub fn ended_since_sql(start: DateTime<Utc>) -> String {
        format!("(r.timestamp + r.duration >= {})", start.timestamp())
    }

    /// The condition [`Scope::of`] keeps games by, over `r`, for counting a scope's
    /// games beside the rest in one query.
    pub fn modes_sql(scope: ScoreScope) -> String {
        let modes = scope
            .modes()
            .iter()
            .map(|mode| format!("'{}'", mode.as_str()))
            .collect::<Vec<_>>()
            .join(", ");

        format!("(r.mode IN ({modes}))")
    }

    pub fn spans_heroes(&self) -> bool {
        self.hero_id.is_none()
    }

    /// Starts a query whose `FROM` is the scoped games as `r`, from `replays_view`,
    /// each joined to the owner's player row as `orp`, after `select`. The scope's
    /// conditions sit in a subquery, so the caller is free to add its own `WHERE`.
    pub fn owner_games(&self, select: &str) -> QueryBuilder<Sqlite> {
        let mut query = QueryBuilder::new(select);
        query.push(" FROM (");
        self.push_replays(&mut query, "*");
        query.push(
            ") r
             JOIN games_players orp
                 ON orp.game_id = r.game_id AND orp.player_id = r.owner_player_id",
        );
        query
    }

    /// Appends a `SELECT` of the scoped games' ids, for reading every player of them.
    /// A game recorded by several of the owner's accounts appears once per replay.
    pub fn push_game_ids(&self, query: &mut QueryBuilder<Sqlite>) {
        self.push_replays(query, "game_id");
    }

    fn push_replays(&self, query: &mut QueryBuilder<Sqlite>, columns: &str) {
        query.push(format!("SELECT {columns} FROM replays_view WHERE 1"));

        if let Some(modes) = self.modes {
            query.push(" AND mode IN (");
            let mut list = query.separated(", ");
            for &mode in modes {
                list.push_bind(mode.as_str());
            }
            query.push(")");
        }

        if let Some(hero_id) = self.hero_id {
            query.push(" AND owner_hero_id = ").push_bind(hero_id);
        }

        if let Some(start) = self.ended_since {
            query.push(" AND timestamp + duration >= ").push_bind(start);
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;
    use sqlx::SqlitePool;

    use super::*;
    use crate::db::replays::test_utils::insert_bundle;
    use crate::db::test_utils::{seeded_pool, GameBuilder};

    async fn insert(pool: &SqlitePool, games: Vec<GameBuilder>) {
        for game in games {
            insert_bundle(pool, game.build()).await.unwrap();
        }
    }

    /// The scoped replays' file names, oldest first.
    async fn names(pool: &SqlitePool, scope: Scope) -> Vec<String> {
        let mut query = scope.owner_games("SELECT r.path");
        query.push(" ORDER BY r.timestamp, r.id");
        let paths: Vec<String> = query.build_query_scalar().fetch_all(pool).await.unwrap();

        paths
            .into_iter()
            .map(|path| path.trim_end_matches(".StormReplay").to_owned())
            .collect()
    }

    #[tokio::test]
    async fn score_scopes_keep_their_modes() {
        let pool = seeded_pool().await;
        insert(
            &pool,
            vec![
                GameBuilder::new("ranked").at(100),
                GameBuilder::new("quick").at(200).mode(Mode::QuickMatch),
                GameBuilder::new("aram").at(300).mode(Mode::Aram),
            ],
        )
        .await;

        assert_eq!(
            names(&pool, Scope::career()).await,
            ["ranked", "quick", "aram"]
        );
        assert_eq!(
            names(&pool, Scope::of(ScoreScope::All)).await,
            ["ranked", "quick"]
        );
        assert_eq!(names(&pool, Scope::of(ScoreScope::Draft)).await, ["ranked"]);
        assert_eq!(
            names(&pool, Scope::of(ScoreScope::QuickMatch)).await,
            ["quick"]
        );
    }

    #[tokio::test]
    async fn the_modes_condition_keeps_what_the_scope_keeps() {
        let pool = seeded_pool().await;
        insert(
            &pool,
            vec![
                GameBuilder::new("ranked").at(100),
                GameBuilder::new("quick").at(200).mode(Mode::QuickMatch),
                GameBuilder::new("aram").at(300).mode(Mode::Aram),
            ],
        )
        .await;

        for scope in [ScoreScope::All, ScoreScope::Draft, ScoreScope::QuickMatch] {
            let mut query = Scope::career().owner_games("SELECT r.path");
            query.push(format!(" WHERE {}", Scope::modes_sql(scope)));
            query.push(" ORDER BY r.timestamp, r.id");
            let paths: Vec<String> = query.build_query_scalar().fetch_all(&pool).await.unwrap();

            let mut expected = Scope::of(scope).owner_games("SELECT r.path");
            expected.push(" ORDER BY r.timestamp, r.id");
            let expected: Vec<String> = expected
                .build_query_scalar()
                .fetch_all(&pool)
                .await
                .unwrap();

            assert!(!paths.is_empty());
            assert_eq!(paths, expected);
        }
    }

    #[tokio::test]
    async fn a_hero_scope_keeps_the_owners_games_on_it() {
        let pool = seeded_pool().await;
        insert(
            &pool,
            vec![
                GameBuilder::new("li-ming").at(100),
                GameBuilder::new("tyrande").at(200).owner_hero("Tyrande"),
                GameBuilder::new("quick tyrande")
                    .at(300)
                    .owner_hero("Tyrande")
                    .mode(Mode::QuickMatch),
            ],
        )
        .await;
        let tyrande: i64 = sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Tyrande'")
            .fetch_one(&pool)
            .await
            .unwrap();
        // Jaina is on the enemy team of every game, never the owner's hero.
        let jaina: i64 = sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Jaina'")
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(
            names(&pool, Scope::career().hero(tyrande)).await,
            ["tyrande", "quick tyrande"]
        );
        assert_eq!(
            names(&pool, Scope::of(ScoreScope::Draft).hero(tyrande)).await,
            ["tyrande"]
        );
        assert!(names(&pool, Scope::career().hero(jaina)).await.is_empty());
        assert!(Scope::career().spans_heroes());
        assert!(!Scope::career().hero(tyrande).spans_heroes());
    }

    #[tokio::test]
    async fn a_game_ending_as_the_window_opens_is_in_it() {
        let pool = seeded_pool().await;
        insert(
            &pool,
            vec![
                GameBuilder::new("before").at(1_000).secs(600),
                GameBuilder::new("after").at(2_000).secs(600),
            ],
        )
        .await;
        let since = |timestamp| {
            Scope::career().ended_since(DateTime::from_timestamp(timestamp, 0).unwrap())
        };

        assert_eq!(names(&pool, since(1_600)).await, ["before", "after"]);
        assert_eq!(names(&pool, since(1_601)).await, ["after"]);
        assert!(names(&pool, since(2_601)).await.is_empty());
    }

    #[tokio::test]
    async fn a_game_two_accounts_recorded_reads_each_owners_line() {
        let pool = seeded_pool().await;
        insert(
            &pool,
            vec![
                GameBuilder::new("main"),
                GameBuilder::new("smurf").recorded_by("main", 7),
            ],
        )
        .await;

        let mut query =
            Scope::career().owner_games("SELECT r.path, h.slug, orp.hero_damage, r.owner_win");
        query.push(" JOIN heroes h ON h.id = orp.hero_id ORDER BY r.id");
        let lines: Vec<(String, String, i64, bool)> =
            query.build_query_as().fetch_all(&pool).await.unwrap();

        assert_eq!(
            lines,
            [
                (
                    "main.StormReplay".to_owned(),
                    "Wizard".to_owned(),
                    29_000,
                    true
                ),
                (
                    "smurf.StormReplay".to_owned(),
                    "DemonHunter".to_owned(),
                    44_000,
                    false
                ),
            ]
        );
    }

    #[tokio::test]
    async fn game_ids_reach_every_player_once() {
        let pool = seeded_pool().await;
        insert(
            &pool,
            vec![
                GameBuilder::new("main").at(100),
                GameBuilder::new("smurf").recorded_by("main", 7),
                GameBuilder::new("aram").at(200).mode(Mode::Aram),
            ],
        )
        .await;

        let mut query = QueryBuilder::new("SELECT COUNT(*) FROM games_players WHERE game_id IN (");
        Scope::of(ScoreScope::All).push_game_ids(&mut query);
        query.push(")");
        let players: i64 = query.build_query_scalar().fetch_one(&pool).await.unwrap();

        assert_eq!(players, 10);
    }
}
