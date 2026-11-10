use sqlx::{QueryBuilder, Sqlite, SqlitePool};

use crate::db::filters::push_filters;
use crate::types::hero_stats::{HeroList, HeroSummary};
use crate::types::replay::ReplayFilters;

/// Returns the heroes the owner played in the games matching `filters`, most played
/// first, with how many heroes the game has.
pub async fn hero_list(pool: &SqlitePool, filters: &ReplayFilters) -> sqlx::Result<HeroList> {
    let mut tx = pool.begin().await?;
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM heroes")
        .fetch_one(&mut *tx)
        .await?;

    let mut query = QueryBuilder::<Sqlite>::new(
        "SELECT h.id AS hero_id, h.name, h.role, h.portrait, h.accent,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses,
             COALESCE(SUM(json_extract(orp.score, '$.Takedowns')), 0) AS takedowns,
             COALESCE(SUM(json_extract(orp.score, '$.Deaths')), 0) AS deaths,
             AVG(json_extract(orp.score, '$.HeroDamage')) AS avg_hero_damage,
             AVG(json_extract(orp.score, '$.Healing')) AS avg_healing,
             AVG(json_extract(orp.score, '$.DamageTaken')) AS avg_damage_taken,
             MAX(r.timestamp) AS last_played
         FROM (SELECT * FROM replays_view WHERE 1 = 1",
    );
    push_filters(&mut query, filters);
    query.push(
        ") r
         JOIN heroes h ON h.id = r.owner_hero_id
         JOIN games_players orp
             ON orp.game_id = r.game_id AND orp.player_id = r.owner_player_id
         GROUP BY h.id
         ORDER BY games DESC, wins DESC, h.name",
    );
    let heroes = query
        .build_query_as::<HeroSummary>()
        .fetch_all(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(HeroList { total, heroes })
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;
    use serde_json::json;

    use super::*;
    use crate::db::replays::insert_bundles;
    use crate::db::replays::test_utils::hero_game;
    use crate::db::test_utils::pool;
    use crate::types::replay::Mode;

    async fn insert_games(pool: &SqlitePool) {
        let mut a = hero_game("a", 400, Mode::Aram, "braxis_holdout", "Wizard", true);
        a.replay_players[0].score =
            json!({"Takedowns": 10, "Deaths": 2, "HeroDamage": 1000, "Healing": 0});
        let mut b = hero_game("b", 300, Mode::QuickMatch, "cursed_hollow", "Wizard", false);
        b.replay_players[0].score = json!({"Takedowns": 4, "Deaths": 3, "HeroDamage": 3000});
        let mut c = hero_game("c", 200, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        c.replay.winner_team = None;
        let d = hero_game("d", 100, Mode::QuickMatch, "cursed_hollow", "Tyrande", true);

        for outcome in insert_bundles(pool, vec![a, b, c, d], 0).await.unwrap() {
            outcome.unwrap();
        }
    }

    #[tokio::test]
    async fn sums_up_each_hero_played() {
        let pool = pool().await;
        insert_games(&pool).await;

        let list = hero_list(&pool, &ReplayFilters::default()).await.unwrap();
        assert_eq!(list.total, 2);
        assert_eq!(list.heroes.len(), 2);

        let wizard = &list.heroes[0];
        assert_eq!(wizard.name, "Wizard");
        assert_eq!((wizard.games, wizard.wins, wizard.losses), (3, 1, 1));
        assert_eq!((wizard.takedowns, wizard.deaths), (14, 5));
        assert_eq!(wizard.avg_hero_damage, Some(2000.0));
        assert_eq!(wizard.avg_healing, Some(0.0));
        assert_eq!(wizard.avg_damage_taken, None);
        assert_eq!(Some(wizard.last_played), DateTime::from_timestamp(400, 0));

        let tyrande = &list.heroes[1];
        assert_eq!(
            (tyrande.games, tyrande.takedowns, tyrande.deaths),
            (1, 0, 0)
        );
    }

    #[tokio::test]
    async fn sums_up_only_the_games_matching_the_filters() {
        let pool = pool().await;
        insert_games(&pool).await;

        let filters = ReplayFilters {
            modes: vec![Mode::QuickMatch],
            from: DateTime::from_timestamp(200, 0),
            ..Default::default()
        };
        let list = hero_list(&pool, &filters).await.unwrap();
        assert_eq!(list.total, 2);
        assert_eq!(list.heroes.len(), 1);

        let wizard = &list.heroes[0];
        assert_eq!((wizard.games, wizard.wins, wizard.losses), (2, 0, 1));
        assert_eq!(Some(wizard.last_played), DateTime::from_timestamp(300, 0));
    }
}
