use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use crate::types::hero_stats::{
    AwardCount, GameLength, HeroBest, HeroBests, HeroDetail, HeroGame, HeroInfo, HeroTotals,
    MapRecord, TalentRecord, TrendPoint, WinStreak,
};

/// The trend covers this many days, ending on the day of the hero's last game.
const TREND_DAYS: i64 = 90;

/// Shorter win streaks aren't worth calling a best.
const MIN_WIN_STREAK: i64 = 2;

/// Where [`lengths`] splits games, in seconds.
const LENGTH_CUTS: [i64; 3] = [15 * 60, 20 * 60, 25 * 60];

/// Returns the owner's stats on a hero, or `None` if the hero doesn't exist. All of them are read from the same snapshot.
pub async fn hero_detail(pool: &SqlitePool, hero_id: i64) -> sqlx::Result<Option<HeroDetail>> {
    let mut tx = pool.begin().await?;
    let Some(hero) = sqlx::query_as::<_, HeroInfo>(
        "SELECT id AS hero_id, name, role, portrait, banner, accent
         FROM heroes WHERE id = ?",
    )
    .bind(hero_id)
    .fetch_optional(&mut *tx)
    .await?
    else {
        return Ok(None);
    };

    let totals = totals(&mut tx, hero_id).await?;
    let awards = awards(&mut tx, hero_id).await?;
    let maps = maps(&mut tx, hero_id).await?;
    let talents = talents(&mut tx, hero_id).await?;
    let trend = trend(&mut tx, hero_id).await?;
    let bests = bests(&mut tx, hero_id).await?;
    let best_game = best_game(&mut tx, hero_id).await?;
    let last_game = last_game(&mut tx, hero_id).await?;
    let lengths = lengths(&mut tx, hero_id).await?;
    tx.commit().await?;

    Ok(Some(HeroDetail {
        hero,
        totals,
        awards,
        maps,
        talents,
        trend,
        bests,
        best_game,
        last_game,
        lengths,
    }))
}

/// Starts a query whose `FROM` is the owner's games on `hero_id`, as `r`, after
/// `select`.
fn hero_games<'args>(select: &str, hero_id: i64) -> QueryBuilder<'args, Sqlite> {
    let mut query = QueryBuilder::new(select);
    query
        .push(" FROM (SELECT * FROM replays WHERE owner_hero_id = ")
        .push_bind(hero_id)
        .push(") r");
    query
}

async fn totals(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<HeroTotals> {
    let mut query = hero_games(
        "WITH games AS (
             SELECT r.owner_win, r.duration, r.timestamp, orp.score, orp.time_dead_secs,
                 SUM(json_extract(tp.score, '$.SoloKill')) AS team_kills,
                 SUM(json_extract(tp.score, '$.HeroDamage')) AS team_hero_damage,
                 SUM(json_extract(tp.score, '$.SiegeDamage')) AS team_siege_damage,
                 SUM(json_extract(tp.score, '$.DamageTaken')) AS team_damage_taken,
                 SUM(json_extract(tp.score, '$.Healing')) AS team_healing,
                 SUM(json_extract(tp.score, '$.ExperienceContribution')) AS team_xp",
        hero_id,
    );
    // Shares average each game's share, so a zero team total drops that game out. Team
    // kills sum the scoreboard's SoloKill: tracker kills miss Leoric's killer and enemy
    // Deaths only counts full wipes.
    query.push(
        " JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         JOIN replays_players tp ON tp.replay_id = r.id AND tp.team = orp.team
         GROUP BY r.id)
         SELECT COUNT(*) AS games,
             COALESCE(SUM(owner_win = 1), 0) AS wins,
             COALESCE(SUM(owner_win = 0), 0) AS losses,
             COALESCE(SUM(json_extract(score, '$.Takedowns')), 0) AS takedowns,
             COALESCE(SUM(json_extract(score, '$.Deaths')), 0) AS deaths,
             COALESCE(SUM(json_extract(score, '$.SoloKill')), 0) AS kills,
             COALESCE(SUM(json_extract(score, '$.Assists')), 0) AS assists,
             COALESCE(SUM(json_extract(score, '$.HeroDamage')), 0) AS hero_damage,
             COALESCE(SUM(json_extract(score, '$.SiegeDamage')), 0) AS siege_damage,
             COALESCE(SUM(json_extract(score, '$.Healing')), 0) AS healing,
             COALESCE(SUM(json_extract(score, '$.SelfHealing')), 0) AS self_healing,
             COALESCE(SUM(json_extract(score, '$.DamageTaken')), 0) AS damage_taken,
             COALESCE(SUM(json_extract(score, '$.ExperienceContribution')), 0) AS xp,
             COALESCE(SUM(json_extract(score, '$.RegenGlobes')), 0) AS globes,
             COALESCE(SUM(json_extract(score, '$.MercCampCaptures')), 0) AS camps,
             AVG(json_extract(score, '$.SoloKill')) AS avg_kills,
             AVG(json_extract(score, '$.Deaths')) AS avg_deaths,
             AVG(json_extract(score, '$.Assists')) AS avg_assists,
             AVG(json_extract(score, '$.HeroDamage')) AS avg_hero_damage,
             AVG(json_extract(score, '$.SiegeDamage')) AS avg_siege_damage,
             AVG(json_extract(score, '$.Healing')) AS avg_healing,
             AVG(json_extract(score, '$.SelfHealing')) AS avg_self_healing,
             AVG(json_extract(score, '$.DamageTaken')) AS avg_damage_taken,
             AVG(json_extract(score, '$.ExperienceContribution')) AS avg_xp,
             AVG(time_dead_secs) AS avg_time_dead_secs,
             AVG(MIN(1.0, json_extract(score, '$.Takedowns') * 1.0 / NULLIF(team_kills, 0)))
                 AS kill_participation,
             AVG(json_extract(score, '$.HeroDamage') * 1.0 / NULLIF(team_hero_damage, 0))
                 AS share_hero_damage,
             AVG(json_extract(score, '$.SiegeDamage') * 1.0 / NULLIF(team_siege_damage, 0))
                 AS share_siege_damage,
             AVG(json_extract(score, '$.DamageTaken') * 1.0 / NULLIF(team_damage_taken, 0))
                 AS share_damage_taken,
             AVG(json_extract(score, '$.Healing') * 1.0 / NULLIF(team_healing, 0))
                 AS share_healing,
             AVG(json_extract(score, '$.ExperienceContribution') * 1.0 / NULLIF(team_xp, 0))
                 AS share_xp,
             AVG(duration) AS avg_duration,
             COALESCE(SUM(duration), 0) AS total_duration,
             COALESCE(SUM(time_dead_secs), 0.0) AS total_time_dead_secs
         FROM games",
    );
    query.build_query_as().fetch_one(conn).await
}

async fn awards(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Vec<AwardCount>> {
    let mut query = hero_games(
        "SELECT rpa.award, a.name, a.description, a.icon, COUNT(*) AS count",
        hero_id,
    );
    query.push(
        " JOIN replays_players_awards rpa
             ON rpa.replay_id = r.id AND rpa.player_id = r.owner_player_id
         LEFT JOIN awards a ON a.id = rpa.award
         GROUP BY rpa.award
         ORDER BY rpa.award = 'mvp' DESC, count DESC, rpa.award",
    );
    query.build_query_as().fetch_all(conn).await
}

async fn maps(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Vec<MapRecord>> {
    let mut query = hero_games(
        "SELECT r.map AS id, COALESCE(m.name, r.map) AS name, m.loading_screen,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses",
        hero_id,
    );
    query.push(
        " LEFT JOIN maps m ON m.id = r.map
         GROUP BY r.map
         ORDER BY games DESC, name",
    );
    query.build_query_as().fetch_all(conn).await
}

async fn talents(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Vec<TalentRecord>> {
    let mut query = hero_games(
        "WITH picks AS (SELECT rpt.tier, rpt.talent_id, r.owner_win",
        hero_id,
    );
    query
        .push(
            " JOIN replays_players_talents rpt
                 ON rpt.replay_id = r.id AND rpt.player_id = r.owner_player_id)
             SELECT p.tier, t.id AS talent_id, t.slug, t.name, t.description, t.icon,
                 COUNT(*) AS picks,
                 COALESCE(SUM(p.owner_win = 1), 0) AS wins,
                 COALESCE(SUM(p.owner_win = 0), 0) AS losses
             FROM picks p
             JOIN talents t ON t.id = p.talent_id
             GROUP BY p.tier, t.id
             UNION ALL
             SELECT t.tier, t.id, t.slug, t.name, t.description, t.icon, 0, 0, 0
             FROM talents t
             WHERE t.hero_id = ",
        )
        .push_bind(hero_id)
        .push(
            " AND NOT EXISTS (
                 SELECT 1 FROM picks p WHERE p.talent_id = t.id AND p.tier = t.tier)
             ORDER BY tier, picks DESC, name, slug",
        );
    query.build_query_as().fetch_all(conn).await
}

async fn trend(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Vec<TrendPoint>> {
    let mut query = hero_games(
        "WITH games AS (
             SELECT r.id, r.timestamp, r.owner_win,
                 date(r.timestamp, 'unixepoch', 'localtime') AS day",
        hero_id,
    );
    // The day cutoff filters the output only: `rates` is unfiltered, so games before
    // the cutoff still feed the career rate.
    query.push(format!(
        "),
         days AS (
             SELECT day, COUNT(*) AS games,
                 COALESCE(SUM(owner_win = 1), 0) AS wins,
                 COALESCE(SUM(owner_win = 0), 0) AS losses
             FROM games
             WHERE day >= (SELECT date(MAX(timestamp), 'unixepoch', 'localtime',
                 '-{back} days') FROM games)
             GROUP BY day),
         rates AS (
             SELECT day, rate,
                 ROW_NUMBER() OVER (PARTITION BY day ORDER BY timestamp DESC, id DESC)
                     AS newest
             FROM (
                 SELECT day, timestamp, id,
                     AVG(owner_win) OVER (ORDER BY timestamp, id
                         ROWS UNBOUNDED PRECEDING) AS rate
                 FROM games
                 WHERE owner_win IS NOT NULL))
         SELECT d.day, d.games, d.wins, d.losses, rt.rate
         FROM days d
         LEFT JOIN rates rt ON rt.day = d.day AND rt.newest = 1
         ORDER BY d.day",
        back = TREND_DAYS - 1,
    ));
    query.build_query_as().fetch_all(conn).await
}

/// What a best ranks the games by, among those meeting `condition`.
struct BestBy {
    value: &'static str,
    condition: &'static str,
    lowest: bool,
}

const fn highest(value: &'static str) -> BestBy {
    BestBy {
        value,
        condition: "",
        lowest: false,
    }
}

const MOST_HERO_DAMAGE: BestBy = highest("json_extract(orp.score, '$.HeroDamage')");
const MOST_SIEGE_DAMAGE: BestBy = highest("json_extract(orp.score, '$.SiegeDamage')");
const MOST_TAKEDOWNS: BestBy = highest("json_extract(orp.score, '$.Takedowns')");
const FASTEST_WIN: BestBy = BestBy {
    value: "r.duration",
    condition: " AND r.owner_win = 1",
    lowest: true,
};

async fn bests(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<HeroBests> {
    Ok(HeroBests {
        hero_damage: best(conn, hero_id, &MOST_HERO_DAMAGE).await?,
        siege_damage: best(conn, hero_id, &MOST_SIEGE_DAMAGE).await?,
        takedowns: best(conn, hero_id, &MOST_TAKEDOWNS).await?,
        fastest_win: best(conn, hero_id, &FASTEST_WIN).await?,
        win_streak: win_streak(conn, hero_id).await?,
    })
}

/// Returns the owner's game on `hero_id` with the best positive value.
/// Ties go to the latest game.
async fn best(
    conn: &mut SqliteConnection,
    hero_id: i64,
    by: &BestBy,
) -> sqlx::Result<Option<HeroBest>> {
    let BestBy {
        value,
        condition,
        lowest,
    } = by;
    let mut query = hero_games(
        &format!(
            "SELECT r.id AS replay_id, CAST({value} AS REAL) AS value,
                 COALESCE(m.name, r.map) AS map, m.loading_screen, r.timestamp"
        ),
        hero_id,
    );
    query.push(format!(
        " JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         LEFT JOIN maps m ON m.id = r.map
         WHERE {value} > 0{condition}
         ORDER BY value {}, r.timestamp DESC, r.id DESC
         LIMIT 1",
        if *lowest { "ASC" } else { "DESC" },
    ));
    query.build_query_as().fetch_optional(conn).await
}

/// Returns the owner's game on `hero_id` with the most kills, with its line. Ties go
/// to the latest game.
async fn best_game(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Option<HeroGame>> {
    let value = "json_extract(orp.score, '$.SoloKill')";
    let tail = format!(
        " WHERE {value} > 0
         ORDER BY {value} DESC, r.timestamp DESC, r.id DESC
         LIMIT 1",
    );
    hero_game(conn, hero_id, &tail).await
}

/// Returns the owner's latest game on `hero_id`, with its line.
async fn last_game(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Option<HeroGame>> {
    hero_game(
        conn,
        hero_id,
        " ORDER BY r.timestamp DESC, r.id DESC
         LIMIT 1",
    )
    .await
}

/// Returns the first of the owner's games on `hero_id` picked by `tail`, a `WHERE`
/// and `ORDER BY` over `r`, `orp` and `m`.
async fn hero_game(
    conn: &mut SqliteConnection,
    hero_id: i64,
    tail: &str,
) -> sqlx::Result<Option<HeroGame>> {
    let mut query = hero_games(
        "SELECT r.id AS replay_id, COALESCE(m.name, r.map) AS map, m.loading_screen,
             r.timestamp, r.duration, r.owner_win,
             CAST(COALESCE(json_extract(orp.score, '$.SoloKill'), 0) AS INTEGER) AS kills,
             CAST(COALESCE(json_extract(orp.score, '$.Deaths'), 0) AS INTEGER) AS deaths,
             CAST(COALESCE(json_extract(orp.score, '$.Assists'), 0) AS INTEGER) AS assists,
             CAST(COALESCE(json_extract(orp.score, '$.HeroDamage'), 0) AS INTEGER)
                 AS hero_damage",
        hero_id,
    );
    query
        .push(
            " JOIN replays_players orp
                 ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
             LEFT JOIN maps m ON m.id = r.map",
        )
        .push(tail);
    query.build_query_as().fetch_optional(conn).await
}

/// Returns the owner's results per game length, split at [`LENGTH_CUTS`].
async fn lengths(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Vec<GameLength>> {
    let cases: String = LENGTH_CUTS
        .iter()
        .enumerate()
        .map(|(index, cut)| format!(" WHEN r.duration < {cut} THEN {index}"))
        .collect();
    let mut query = hero_games(
        &format!(
            "SELECT CASE{cases} ELSE {} END AS bucket,
                 COUNT(*),
                 COALESCE(SUM(r.owner_win = 1), 0),
                 COALESCE(SUM(r.owner_win = 0), 0)",
            LENGTH_CUTS.len(),
        ),
        hero_id,
    );
    query.push(" GROUP BY bucket");
    let rows: Vec<(i64, i64, i64, i64)> = query.build_query_as().fetch_all(conn).await?;

    Ok((0..=LENGTH_CUTS.len())
        .map(|index| {
            let (games, wins, losses) = rows
                .iter()
                .find(|row| row.0 == index as i64)
                .map_or((0, 0, 0), |row| (row.1, row.2, row.3));
            GameLength {
                from: index.checked_sub(1).map_or(0, |prev| LENGTH_CUTS[prev]),
                to: LENGTH_CUTS.get(index).copied(),
                games,
                wins,
                losses,
            }
        })
        .collect())
}

async fn win_streak(conn: &mut SqliteConnection, hero_id: i64) -> sqlx::Result<Option<WinStreak>> {
    let mut query = hero_games("SELECT r.owner_win, r.timestamp", hero_id);
    query.push(" ORDER BY r.timestamp, r.id");
    let results: Vec<(Option<bool>, DateTime<Utc>)> =
        query.build_query_as().fetch_all(conn).await?;

    Ok(longest_streak(&results))
}

/// Finds the longest run of wins, the latest of the longest on a tie. A game without a
/// result neither breaks the run nor adds to it.
fn longest_streak(results: &[(Option<bool>, DateTime<Utc>)]) -> Option<WinStreak> {
    let mut longest: Option<WinStreak> = None;
    let mut current = 0;

    for &(win, timestamp) in results {
        match win {
            Some(true) => {
                current += 1;
                if longest
                    .as_ref()
                    .is_none_or(|streak| current >= streak.games)
                {
                    longest = Some(WinStreak {
                        games: current,
                        ended: timestamp,
                    });
                }
            }
            Some(false) => current = 0,
            None => {}
        }
    }

    longest.filter(|streak| streak.games >= MIN_WIN_STREAK)
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;
    use serde_json::json;

    use super::*;
    use crate::db::replays::test_utils::{hero_game, insert_bundle};
    use crate::db::test_utils::pool;
    use crate::types::hero::Hero;
    use crate::types::player::Player;
    use crate::types::replay::{Mode, NewReplayBundle, NewReplayPlayer, NewTalent};

    fn talent(tier: i64, slug: &str) -> NewTalent {
        NewTalent {
            tier,
            slug: slug.to_owned(),
            gameloop: 0,
        }
    }

    async fn insert_games(pool: &SqlitePool) -> i64 {
        let mut a = hero_game("a", 400, Mode::Aram, "braxis_holdout", "Wizard", true);
        a.replay_players[0].score = json!({"SoloKill": 4, "Takedowns": 10, "Deaths": 2, "HeroDamage": 1000, "RegenGlobes": 5});
        a.replay_players[0].time_dead_secs = Some(30.0);
        a.replay_players[0].talents = vec![talent(1, "spark"), talent(2, "flare")];
        let mut b = hero_game("b", 300, Mode::QuickMatch, "cursed_hollow", "Wizard", false);
        b.replay_players[0].score =
            json!({"SoloKill": 2, "Takedowns": 4, "Deaths": 3, "HeroDamage": 3000});
        b.replay_players[0].awards = vec!["most_kills".to_owned()];
        b.replay_players[0].talents = vec![talent(1, "spark"), talent(2, "blink")];
        let mut c = hero_game("c", 200, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        c.replay.owner_win = None;
        c.replay_players[0].talents = vec![talent(1, "spark"), talent(2, "spark_moved")];
        let d = hero_game("d", 100, Mode::QuickMatch, "cursed_hollow", "Tyrande", true);

        for game in [a, b, c, d] {
            insert_bundle(pool, game).await.unwrap();
        }
        let wizard = sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Wizard'")
            .fetch_one(pool)
            .await
            .unwrap();

        // A talent seeded at the third tier but picked at the second in an old game,
        // and one never picked.
        sqlx::query("UPDATE talents SET tier = 3 WHERE slug = 'spark_moved'")
            .execute(pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO talents (hero_id, slug, tier, name) VALUES (?, 'nova', 3, 'Nova')",
        )
        .bind(wizard)
        .execute(pool)
        .await
        .unwrap();
        wizard
    }

    fn talent_rows(detail: &HeroDetail) -> Vec<(i64, &str, i64, i64, i64)> {
        detail
            .talents
            .iter()
            .map(|t| (t.tier, t.slug.as_str(), t.picks, t.wins, t.losses))
            .collect()
    }

    #[tokio::test]
    async fn sums_up_the_owner_on_a_hero() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        assert_eq!(detail.hero.name, "Wizard");

        let totals = &detail.totals;
        assert_eq!((totals.games, totals.wins, totals.losses), (3, 1, 1));
        assert_eq!((totals.takedowns, totals.deaths), (14, 5));
        assert_eq!(totals.avg_kills, Some(3.0));
        assert_eq!(totals.avg_hero_damage, Some(2000.0));
        assert_eq!(totals.avg_healing, None);
        assert_eq!(totals.avg_time_dead_secs, Some(30.0));
        assert_eq!(
            (totals.kills, totals.hero_damage, totals.healing),
            (6, 4000, 0)
        );
        assert_eq!((totals.globes, totals.camps), (5, 0));
        assert_eq!(totals.total_time_dead_secs, 30.0);
        assert_eq!(
            Some(totals.total_duration as f64),
            totals.avg_duration.map(|avg| avg * 3.0)
        );

        let awards: Vec<_> = detail
            .awards
            .iter()
            .map(|a| (a.award.award.as_str(), a.count))
            .collect();
        assert_eq!(awards, [("mvp", 2), ("most_kills", 1)]);

        let maps: Vec<_> = detail
            .maps
            .iter()
            .map(|m| (m.id.as_str(), m.games, m.wins, m.losses))
            .collect();
        assert_eq!(
            maps,
            [("cursed_hollow", 2, 0, 1), ("braxis_holdout", 1, 1, 0)]
        );

        assert_eq!(
            talent_rows(&detail),
            [
                (1, "spark", 3, 1, 1),
                (2, "blink", 1, 0, 1),
                (2, "flare", 1, 1, 0),
                (2, "spark_moved", 1, 0, 0),
                (3, "spark_moved", 0, 0, 0),
                (3, "nova", 0, 0, 0),
            ]
        );
    }

    #[tokio::test]
    async fn shares_the_owners_team_totals() {
        let pool = pool().await;

        let mut a = hero_game("a", 200, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        a.replay_players[0].score = json!({
            "SoloKill": 2, "Takedowns": 6, "HeroDamage": 1000, "Healing": 0,
            "ExperienceContribution": 500,
        });
        with_player(&mut a, "ally", 0, "Knight");
        a.replay_players[1].score = json!({
            "SoloKill": 2, "HeroDamage": 3000, "Healing": 0, "ExperienceContribution": 1500,
        });
        with_player(&mut a, "enemy", 1, "Rogue");
        a.replay_players[2].score = json!({
            "SoloKill": 10, "HeroDamage": 9000, "Healing": 5000, "ExperienceContribution": 9000,
        });

        let mut b = hero_game("b", 100, Mode::QuickMatch, "cursed_hollow", "Wizard", false);
        b.replay_players[0].score = json!({"SoloKill": 1, "Takedowns": 2, "HeroDamage": 1000});
        with_player(&mut b, "ally", 0, "Knight");
        b.replay_players[1].score = json!({"SoloKill": 3, "HeroDamage": 1000});

        for game in [a, b] {
            insert_bundle(&pool, game).await.unwrap();
        }
        let wizard = sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Wizard'")
            .fetch_one(&pool)
            .await
            .unwrap();

        let totals = hero_detail(&pool, wizard).await.unwrap().unwrap().totals;

        // Game a's 6 takedowns over 4 team kills cap at 1, game b's are 2 of 4.
        assert_eq!(totals.kill_participation, Some(0.75));
        assert_eq!(totals.share_hero_damage, Some(0.375));
        assert_eq!(totals.share_xp, Some(0.25));
        assert_eq!(totals.share_healing, None);
        assert_eq!(totals.share_siege_damage, None);
    }

    async fn replay_id(pool: &SqlitePool, name: &str) -> i64 {
        sqlx::query_scalar("SELECT id FROM replays WHERE path = ?")
            .bind(format!("{name}.StormReplay"))
            .fetch_one(pool)
            .await
            .unwrap()
    }

    fn best(best: &Option<HeroBest>) -> Option<(i64, f64, &str)> {
        best.as_ref()
            .map(|best| (best.replay_id, best.value, best.map.as_str()))
    }

    #[tokio::test]
    async fn finds_the_owners_bests_on_a_hero() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;
        let a = replay_id(&pool, "a").await;
        let b = replay_id(&pool, "b").await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        let bests = &detail.bests;
        assert_eq!(best(&bests.hero_damage), Some((b, 3000.0, "cursed_hollow")));
        assert_eq!(best(&bests.takedowns), Some((a, 10.0, "braxis_holdout")));
        assert_eq!(best(&bests.siege_damage), None);
        assert_eq!(best(&bests.fastest_win), Some((a, 62.0, "braxis_holdout")));
        assert!(bests.win_streak.is_none());
    }

    #[tokio::test]
    async fn finds_the_best_game_line() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;
        let a = replay_id(&pool, "a").await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        let game = detail.best_game.unwrap();
        assert_eq!(game.replay_id, a);
        assert_eq!((game.map.as_str(), game.duration), ("braxis_holdout", 62));
        assert_eq!(game.owner_win, Some(true));
        assert_eq!(
            (game.kills, game.deaths, game.assists, game.hero_damage),
            (4, 2, 0, 1000)
        );
    }

    #[tokio::test]
    async fn finds_the_last_game_line() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;
        let mut e = hero_game("e", 500, Mode::QuickMatch, "cursed_hollow", "Wizard", false);
        e.replay_players[0].score = json!({"SoloKill": 1, "Deaths": 5, "Assists": 3});
        insert_bundle(&pool, e).await.unwrap();
        let e = replay_id(&pool, "e").await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        let game = detail.last_game.unwrap();
        assert_eq!(game.replay_id, e);
        assert_eq!(game.map, "cursed_hollow");
        assert_eq!(game.owner_win, Some(false));
        assert_eq!((game.kills, game.deaths, game.assists), (1, 5, 3));
        assert_ne!(detail.best_game.unwrap().replay_id, e);
    }

    async fn wizard_id(pool: &SqlitePool) -> i64 {
        sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Wizard'")
            .fetch_one(pool)
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn splits_games_by_length() {
        let pool = pool().await;
        let durations = [
            ("a", 899, true),
            ("b", 900, false),
            ("c", 1499, true),
            ("d", 1500, true),
        ];
        for (index, (name, duration, win)) in durations.into_iter().enumerate() {
            let mut game = hero_game(
                name,
                100 + index as i64,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                win,
            );
            game.replay.duration = duration;
            insert_bundle(&pool, game).await.unwrap();
        }
        let wizard = wizard_id(&pool).await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        let lengths: Vec<_> = detail
            .lengths
            .iter()
            .map(|l| (l.from, l.to, l.games, l.wins, l.losses))
            .collect();
        assert_eq!(
            lengths,
            [
                (0, Some(900), 1, 1, 0),
                (900, Some(1200), 1, 0, 1),
                (1200, Some(1500), 1, 1, 0),
                (1500, None, 1, 1, 0),
            ]
        );
    }

    fn with_player(game: &mut NewReplayBundle, toon: &str, team: i64, hero: &str) {
        game.players.push(Player {
            toon: toon.to_owned(),
            name: toon.to_owned(),
            account_level: None,
        });
        game.heroes.push(Hero {
            slug: hero.to_owned(),
            name: hero.to_owned(),
        });
        game.replay_players.push(NewReplayPlayer {
            toon: toon.to_owned(),
            slot: game.replay_players.len() as i64 + 1,
            team,
            hero_slug: hero.to_owned(),
            time_dead_secs: None,
            time_on_fire_secs: None,
            upvotes: 0,
            party: None,
            xp: None,
            score: json!({}),
            talents: vec![],
            awards: vec![],
        });
    }

    #[test]
    fn finds_the_latest_longest_win_streak() {
        let at = |timestamp| DateTime::from_timestamp(timestamp, 0).unwrap();
        let results = [
            (Some(true), at(1)),
            (None, at(2)),
            (Some(true), at(3)),
            (Some(false), at(4)),
            (Some(true), at(5)),
            (Some(true), at(6)),
            (Some(false), at(7)),
        ];

        let streak = longest_streak(&results).unwrap();
        assert_eq!((streak.games, streak.ended), (2, at(6)));
        assert!(longest_streak(&results[..4]).is_some());
        assert!(longest_streak(&results[3..5]).is_none());
    }

    fn trend_rows(detail: &HeroDetail) -> Vec<(&str, i64, i64, i64, Option<f64>)> {
        detail
            .trend
            .iter()
            .map(|p| (p.day.as_str(), p.games, p.wins, p.losses, p.rate))
            .collect()
    }

    fn local_day(timestamp: i64) -> String {
        DateTime::from_timestamp(timestamp, 0)
            .unwrap()
            .with_timezone(&chrono::Local)
            .format("%Y-%m-%d")
            .to_string()
    }

    /// More than a day plus any DST shift, so games land on distinct local days.
    const DAY_APART: i64 = 100_000;

    #[tokio::test]
    async fn accumulates_the_rate_over_career_games() {
        let pool = pool().await;
        let start = 1_700_000_000;
        let loss = hero_game(
            "a",
            start,
            Mode::QuickMatch,
            "cursed_hollow",
            "Wizard",
            false,
        );
        insert_bundle(&pool, loss).await.unwrap();
        for n in 1..=10 {
            let win = hero_game(
                &format!("w{n}"),
                start + n * DAY_APART,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                true,
            );
            insert_bundle(&pool, win).await.unwrap();
        }
        let wizard = wizard_id(&pool).await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        let rows = trend_rows(&detail);
        assert_eq!(rows.len(), 11);
        assert_eq!(rows[0], (local_day(start).as_str(), 1, 0, 1, Some(0.0)));
        assert_eq!(rows[9].4, Some(9.0 / 10.0));
        assert_eq!(rows[10].4, Some(10.0 / 11.0));
    }

    #[tokio::test]
    async fn counts_undecided_games_without_rating_them() {
        let pool = pool().await;
        let start = 1_700_000_000;
        let win = hero_game(
            "a",
            start,
            Mode::QuickMatch,
            "cursed_hollow",
            "Wizard",
            true,
        );
        let mut undecided = hero_game(
            "b",
            start + 60,
            Mode::QuickMatch,
            "cursed_hollow",
            "Wizard",
            true,
        );
        undecided.replay.owner_win = None;
        let loss = hero_game(
            "c",
            start + 120,
            Mode::QuickMatch,
            "cursed_hollow",
            "Wizard",
            false,
        );
        let mut alone = hero_game(
            "d",
            start + DAY_APART,
            Mode::QuickMatch,
            "cursed_hollow",
            "Wizard",
            true,
        );
        alone.replay.owner_win = None;
        for game in [win, undecided, loss, alone] {
            insert_bundle(&pool, game).await.unwrap();
        }
        let wizard = wizard_id(&pool).await;

        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        assert_eq!(
            trend_rows(&detail),
            [
                (local_day(start).as_str(), 3, 1, 1, Some(0.5)),
                (local_day(start + DAY_APART).as_str(), 1, 0, 0, None),
            ]
        );
    }

    #[tokio::test]
    async fn limits_the_trend_to_the_last_ninety_days() {
        let pool = pool().await;
        let start = 1_700_000_000;
        let late = start + 100 * 24 * 60 * 60;
        let loss = hero_game(
            "a",
            start,
            Mode::QuickMatch,
            "cursed_hollow",
            "Wizard",
            false,
        );
        let win = hero_game("b", late, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        insert_bundle(&pool, loss).await.unwrap();
        insert_bundle(&pool, win).await.unwrap();
        let wizard = wizard_id(&pool).await;

        // The old loss is before the cutoff, so it has no point, but it still
        // feeds the career rate.
        let detail = hero_detail(&pool, wizard).await.unwrap().unwrap();
        assert_eq!(
            trend_rows(&detail),
            [(local_day(late).as_str(), 1, 1, 0, Some(0.5))]
        );
    }

    #[tokio::test]
    async fn returns_empty_stats_for_a_hero_without_games() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;
        let nova: i64 = sqlx::query_scalar(
            "INSERT INTO heroes (slug, name) VALUES ('Nova', 'Nova') RETURNING id",
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        let detail = hero_detail(&pool, nova).await.unwrap().unwrap();
        assert_eq!(detail.totals.games, 0);
        assert_eq!(detail.totals.avg_kills, None);
        assert!(detail.maps.is_empty());
        assert!(detail.trend.is_empty());
        assert!(detail.bests.hero_damage.is_none() && detail.bests.fastest_win.is_none());
        assert!(detail.best_game.is_none() && detail.last_game.is_none());
        assert!(detail.lengths.iter().all(|length| length.games == 0));

        assert!(hero_detail(&pool, wizard + 100).await.unwrap().is_none());
    }
}
