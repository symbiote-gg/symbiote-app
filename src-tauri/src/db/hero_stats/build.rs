use chrono::{DateTime, Utc};
use sqlx::{FromRow, SqlitePool};

use crate::types::hero_stats::{BuildKey, RandomBuild};
use crate::types::replay::TalentPick;

#[derive(FromRow)]
struct BuildMeta {
    replay_id: i64,
    player_name: String,
    map: String,
    timestamp: DateTime<Utc>,
}

/// Returns the full build of a random player other than the owner who won a game on
/// `hero_id`, or `None` if there's none. A build only counts when every pick still has
/// its place in its tier, so its code imports the same talents in game.
///
/// `exclude` goes last, so a reroll lands on another build whenever there is one.
pub async fn random_build(
    pool: &SqlitePool,
    hero_id: i64,
    exclude: Option<BuildKey>,
) -> sqlx::Result<Option<RandomBuild>> {
    let mut tx = pool.begin().await?;

    // AI share a handful of toons and play fixed builds, so they aren't players here.
    let Some(key) = sqlx::query_as::<_, BuildKey>(
        "SELECT gp.game_id, gp.player_id
         FROM games_players gp
         JOIN games g ON g.id = gp.game_id AND g.winner_team = gp.team
         JOIN players p ON p.id = gp.player_id
         WHERE gp.hero_id = ?
             AND p.toon NOT LIKE 'ai-%'
             AND gp.player_id NOT IN (SELECT owner_player_id FROM replays)
             AND (SELECT COUNT(*) FROM games_players_talents gpt
                 JOIN talents t ON t.id = gpt.talent_id
                 WHERE gpt.game_id = gp.game_id AND gpt.player_id = gp.player_id
                     AND t.sort IS NOT NULL) = 7
         ORDER BY (gp.game_id IS ? AND gp.player_id IS ?), RANDOM()
         LIMIT 1",
    )
    .bind(hero_id)
    .bind(exclude.map(|key| key.game_id))
    .bind(exclude.map(|key| key.player_id))
    .fetch_optional(&mut *tx)
    .await?
    else {
        return Ok(None);
    };

    let meta = sqlx::query_as::<_, BuildMeta>(
        "SELECT (SELECT MIN(r.id) FROM replays r WHERE r.game_id = g.id) AS replay_id,
             p.name AS player_name, COALESCE(m.name, g.map) AS map, g.timestamp
         FROM games g
         JOIN players p ON p.id = ?
         LEFT JOIN maps m ON m.id = g.map
         WHERE g.id = ?",
    )
    .bind(key.player_id)
    .bind(key.game_id)
    .fetch_one(&mut *tx)
    .await?;

    let talents = sqlx::query_as::<_, TalentPick>(
        "SELECT gpt.tier, gpt.talent_id, t.slug, gpt.gameloop, t.sort,
             t.name, t.description, t.icon
         FROM games_players_talents gpt
         JOIN talents t ON t.id = gpt.talent_id
         WHERE gpt.game_id = ? AND gpt.player_id = ?
         ORDER BY gpt.tier",
    )
    .bind(key.game_id)
    .bind(key.player_id)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(Some(RandomBuild {
        key,
        replay_id: meta.replay_id,
        player_name: meta.player_name,
        map: meta.map,
        timestamp: meta.timestamp,
        talents,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::replays::test_utils::{hex, insert_bundle};
    use crate::db::test_utils::{seeded_pool, GameBuilder};
    use crate::types::replay::{NewReplayBundle, NewTalent};

    /// The roster index of team 0's Muradin, who wins with the owner.
    const WINNER: usize = 0;

    /// The roster index of team 1's Artanis, who loses to the owner.
    const LOSER: usize = 6;

    fn picks(tiers: i64) -> Vec<NewTalent> {
        (1..=tiers)
            .map(|tier| NewTalent {
                tier,
                slug: format!("talent_{tier}"),
                gameloop: tier * 100,
            })
            .collect()
    }

    /// A game where the player at `index` plays Muradin with `tiers` picks.
    fn game(name: &str, index: usize, tiers: i64) -> NewReplayBundle {
        let mut game = GameBuilder::new(name).build();
        let muradin = game.replay_players[0].hero_slug.clone();
        game.replay_players[0].hero_slug = game.replay_players[index].hero_slug.clone();
        game.replay_players[index].hero_slug = muradin;
        game.replay_players[index].talents = picks(tiers);
        game
    }

    async fn insert(pool: &SqlitePool, games: Vec<NewReplayBundle>) {
        for game in games {
            insert_bundle(pool, game).await.unwrap();
        }
        sqlx::query("UPDATE talents SET sort = 1")
            .execute(pool)
            .await
            .unwrap();
    }

    async fn muradin(pool: &SqlitePool) -> i64 {
        sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Muradin'")
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn returns_a_winning_full_build() {
        let pool = seeded_pool().await;
        insert(&pool, vec![game("a", WINNER, 7)]).await;

        let build = random_build(&pool, muradin(&pool).await, None)
            .await
            .unwrap()
            .expect("a build");

        assert_eq!(build.player_name, "player-0");
        let tiers: Vec<i64> = build.talents.iter().map(|pick| pick.tier).collect();
        assert_eq!(tiers, [1, 2, 3, 4, 5, 6, 7]);
    }

    #[tokio::test]
    async fn skips_the_owners_accounts() {
        let pool = seeded_pool().await;
        let mut other_account = game("b", WINNER, 7);
        other_account.replay.game_key = hex("a");
        other_account.replay.owner_toon = "player-0".to_owned();
        insert(&pool, vec![game("a", WINNER, 7), other_account]).await;

        assert!(random_build(&pool, muradin(&pool).await, None)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn skips_losses_and_short_builds() {
        let pool = seeded_pool().await;
        insert(&pool, vec![game("a", LOSER, 7), game("b", WINNER, 6)]).await;

        assert!(random_build(&pool, muradin(&pool).await, None)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn skips_talents_without_a_place() {
        let pool = seeded_pool().await;
        insert(&pool, vec![game("a", WINNER, 7)]).await;
        sqlx::query("UPDATE talents SET sort = NULL WHERE slug = 'talent_3'")
            .execute(&pool)
            .await
            .unwrap();

        assert!(random_build(&pool, muradin(&pool).await, None)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn rerolls_to_another_build() {
        let pool = seeded_pool().await;
        insert(&pool, vec![game("a", WINNER, 7), game("b", WINNER, 7)]).await;
        let hero_id = muradin(&pool).await;

        let first = random_build(&pool, hero_id, None).await.unwrap().unwrap();
        for _ in 0..10 {
            let next = random_build(&pool, hero_id, Some(first.key))
                .await
                .unwrap()
                .unwrap();
            assert_ne!(next.key.game_id, first.key.game_id);
        }
    }

    #[tokio::test]
    async fn rerolls_to_the_same_build_when_alone() {
        let pool = seeded_pool().await;
        insert(&pool, vec![game("a", WINNER, 7)]).await;
        let hero_id = muradin(&pool).await;

        let first = random_build(&pool, hero_id, None).await.unwrap().unwrap();
        let next = random_build(&pool, hero_id, Some(first.key))
            .await
            .unwrap()
            .unwrap();
        assert_eq!(next.key.game_id, first.key.game_id);
    }
}
