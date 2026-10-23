use chrono::{DateTime, Utc};
use sqlx::SqlitePool;

use crate::types::hero::HeroRole;
use crate::types::stats::{HeroStat, MostPlayedHeroes, ProfileSummary};

/// How many of the latest results [`profile_summary`] returns.
const RECENT_GAMES: i64 = 20;

/// Sums up the owner's results, counting games played since `since` separately.
///
/// All the figures are read from the same snapshot, so they agree with each other.
pub async fn profile_summary(
    pool: &SqlitePool,
    since: DateTime<Utc>,
) -> sqlx::Result<ProfileSummary> {
    let mut tx = pool.begin().await?;
    let (games, wins, losses): (i64, i64, i64) = sqlx::query_as(
        "SELECT COUNT(*),
             COALESCE(SUM(owner_win = 1), 0),
             COALESCE(SUM(owner_win = 0), 0)
         FROM replays",
    )
    .bind(since.timestamp())
    .fetch_one(&mut *tx)
    .await?;

    let mvps: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)
         FROM replays r
         JOIN replays_players_awards a
             ON a.replay_id = r.id AND a.player_id = r.owner_player_id
         WHERE a.award = 'mvp'",
    )
    .fetch_one(&mut *tx)
    .await?;

    let top_damage_games: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)
         FROM replays r
         JOIN replays_players o
             ON o.replay_id = r.id AND o.player_id = r.owner_player_id
         WHERE COALESCE(json_extract(o.score, '$.HeroDamage'), 0) > 0
           AND COALESCE(json_extract(o.score, '$.HeroDamage'), 0) >= (
               SELECT MAX(COALESCE(json_extract(t.score, '$.HeroDamage'), 0))
               FROM replays_players t
               WHERE t.replay_id = r.id AND t.team = o.team
           )",
    )
    .fetch_one(&mut *tx)
    .await?;

    let main_role: Option<HeroRole> = sqlx::query_scalar(
        "SELECT h.role
         FROM replays r
         JOIN heroes h ON h.id = r.owner_hero_id
         WHERE h.role IS NOT NULL
         GROUP BY h.role
         ORDER BY COUNT(*) DESC
         LIMIT 1",
    )
    .fetch_optional(&mut *tx)
    .await?;

    let recent: Vec<Option<bool>> = sqlx::query_scalar(
        "SELECT owner_win FROM replays ORDER BY timestamp DESC, id DESC LIMIT ?",
    )
    .bind(RECENT_GAMES)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(ProfileSummary {
        games,
        wins,
        losses,
        mvps,
        top_damage_games,
        main_role,
        recent,
    })
}

/// Returns the `limit` heroes the owner played the most, with how many heroes they
/// played overall.
pub async fn most_played_heroes(pool: &SqlitePool, limit: i64) -> sqlx::Result<MostPlayedHeroes> {
    let mut tx = pool.begin().await?;
    let (played, total): (i64, i64) = sqlx::query_as(
        "SELECT (SELECT COUNT(DISTINCT owner_hero_id) FROM replays),
             (SELECT COUNT(*) FROM heroes)",
    )
    .fetch_one(&mut *tx)
    .await?;

    let heroes = sqlx::query_as::<_, HeroStat>(
        "SELECT h.id AS hero_id, h.name, h.portrait,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins
         FROM replays r
         JOIN heroes h ON h.id = r.owner_hero_id
         GROUP BY h.id
         ORDER BY games DESC, wins DESC, h.name
         LIMIT ?",
    )
    .bind(limit)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;

    Ok(MostPlayedHeroes {
        played,
        total,
        heroes,
    })
}
