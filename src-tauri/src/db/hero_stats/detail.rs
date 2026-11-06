use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use crate::db::filters::push_filters;
use crate::types::hero_stats::{
    AllyHero, AwardCount, BestGame, GameLength, HeroBest, HeroBests, HeroDetail, HeroInfo,
    HeroTotals, HeroTrend, MapRecord, TalentRecord, TrendBucket, TrendPoint, WinStreak,
};
use crate::types::replay::ReplayFilters;

/// Games spread over less than this many seconds are bucketed by week, not month.
const WEEKLY_SPAN: i64 = 13 * 7 * 24 * 60 * 60;

/// Shorter win streaks aren't worth calling a best.
const MIN_WIN_STREAK: i64 = 2;

/// Where [`lengths`] splits games, in seconds.
const LENGTH_CUTS: [i64; 3] = [15 * 60, 20 * 60, 25 * 60];

/// Returns the owner's stats on a hero over the games matching `filters`, or `None`
/// if the hero doesn't exist. All of them are read from the same snapshot.
pub async fn hero_detail(
    pool: &SqlitePool,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Option<HeroDetail>> {
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

    let totals = totals(&mut tx, hero_id, filters).await?;
    let awards = awards(&mut tx, hero_id, filters).await?;
    let maps = maps(&mut tx, hero_id, filters).await?;
    let talents = talents(&mut tx, hero_id, filters).await?;
    let trend = trend(&mut tx, hero_id, filters).await?;
    let bests = bests(&mut tx, hero_id, filters).await?;
    let best_game = best_game(&mut tx, hero_id, filters).await?;
    let lengths = lengths(&mut tx, hero_id, filters).await?;
    let ally = ally(&mut tx, hero_id, filters).await?;
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
        lengths,
        ally,
    }))
}

/// Starts a query whose `FROM` is the owner's games on `hero_id` matching `filters`,
/// as `r`, after `select`.
fn hero_games<'args>(
    select: &str,
    hero_id: i64,
    filters: &ReplayFilters,
) -> QueryBuilder<'args, Sqlite> {
    let mut query = QueryBuilder::new(select);
    query
        .push(" FROM (SELECT * FROM replays WHERE owner_hero_id = ")
        .push_bind(hero_id);
    push_filters(&mut query, filters);
    query.push(") r");
    query
}

async fn totals(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<HeroTotals> {
    let mut query = hero_games(
        "SELECT COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses,
             COALESCE(SUM(json_extract(orp.score, '$.Takedowns')), 0) AS takedowns,
             COALESCE(SUM(json_extract(orp.score, '$.Deaths')), 0) AS deaths,
             AVG(json_extract(orp.score, '$.SoloKill')) AS avg_kills,
             AVG(json_extract(orp.score, '$.Deaths')) AS avg_deaths,
             AVG(json_extract(orp.score, '$.Assists')) AS avg_assists,
             AVG(json_extract(orp.score, '$.Takedowns')) AS avg_takedowns,
             AVG(json_extract(orp.score, '$.HeroDamage')) AS avg_hero_damage,
             AVG(json_extract(orp.score, '$.SiegeDamage')) AS avg_siege_damage,
             AVG(json_extract(orp.score, '$.Healing')) AS avg_healing,
             AVG(json_extract(orp.score, '$.SelfHealing')) AS avg_self_healing,
             AVG(json_extract(orp.score, '$.DamageTaken')) AS avg_damage_taken,
             AVG(json_extract(orp.score, '$.ExperienceContribution')) AS avg_xp,
             AVG(orp.time_dead_secs) AS avg_time_dead_secs,
             AVG(r.duration) AS avg_duration,
             COALESCE(SUM(r.duration), 0) AS total_duration,
             MAX(r.timestamp) AS last_played",
        hero_id,
        filters,
    );
    query.push(
        " JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id",
    );
    query.build_query_as().fetch_one(conn).await
}

async fn awards(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Vec<AwardCount>> {
    let mut query = hero_games(
        "SELECT rpa.award, a.name, a.description, a.icon, COUNT(*) AS count",
        hero_id,
        filters,
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

async fn maps(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Vec<MapRecord>> {
    let mut query = hero_games(
        "SELECT r.map AS id, COALESCE(m.name, r.map) AS name, m.loading_screen,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses",
        hero_id,
        filters,
    );
    query.push(
        " LEFT JOIN maps m ON m.id = r.map
         GROUP BY r.map
         ORDER BY games DESC, name",
    );
    query.build_query_as().fetch_all(conn).await
}

async fn talents(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Vec<TalentRecord>> {
    let mut query = hero_games(
        "WITH picks AS (SELECT rpt.tier, rpt.talent_id, r.owner_win",
        hero_id,
        filters,
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
            " AND t.id NOT IN (SELECT talent_id FROM picks)
             ORDER BY tier, picks DESC, name, slug",
        );
    query.build_query_as().fetch_all(conn).await
}

async fn trend(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<HeroTrend> {
    let (first, last): (Option<i64>, Option<i64>) = hero_games(
        "SELECT MIN(r.timestamp), MAX(r.timestamp)",
        hero_id,
        filters,
    )
    .build_query_as()
    .fetch_one(&mut *conn)
    .await?;
    let bucket = match first.zip(last) {
        Some((first, last)) if last - first < WEEKLY_SPAN => TrendBucket::Week,
        _ => TrendBucket::Month,
    };
    let start = match bucket {
        TrendBucket::Week => "date(r.timestamp, 'unixepoch', 'localtime', '-6 days', 'weekday 1')",
        TrendBucket::Month => "strftime('%Y-%m-01', r.timestamp, 'unixepoch', 'localtime')",
    };

    let mut query = hero_games(
        &format!(
            "SELECT {start} AS start,
                 COUNT(*) AS games,
                 COALESCE(SUM(r.owner_win = 1), 0) AS wins,
                 COALESCE(SUM(r.owner_win = 0), 0) AS losses"
        ),
        hero_id,
        filters,
    );
    query.push(" GROUP BY start ORDER BY start");
    let points: Vec<TrendPoint> = query.build_query_as().fetch_all(conn).await?;

    Ok(HeroTrend { bucket, points })
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

const MOST_KILLS: BestBy = highest("json_extract(orp.score, '$.SoloKill')");
const MOST_HERO_DAMAGE: BestBy = highest("json_extract(orp.score, '$.HeroDamage')");
const MOST_SIEGE_DAMAGE: BestBy = highest("json_extract(orp.score, '$.SiegeDamage')");
const MOST_TAKEDOWNS: BestBy = highest("json_extract(orp.score, '$.Takedowns')");
const FASTEST_WIN: BestBy = BestBy {
    value: "r.duration",
    condition: " AND r.owner_win = 1",
    lowest: true,
};

async fn bests(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<HeroBests> {
    Ok(HeroBests {
        kills: best(conn, hero_id, filters, &MOST_KILLS).await?,
        hero_damage: best(conn, hero_id, filters, &MOST_HERO_DAMAGE).await?,
        siege_damage: best(conn, hero_id, filters, &MOST_SIEGE_DAMAGE).await?,
        takedowns: best(conn, hero_id, filters, &MOST_TAKEDOWNS).await?,
        fastest_win: best(conn, hero_id, filters, &FASTEST_WIN).await?,
        win_streak: win_streak(conn, hero_id, filters).await?,
    })
}

/// Returns the owner's game on `hero_id` matching `filters` with the best positive value.
/// Ties go to the latest game.
async fn best(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
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
        filters,
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

/// Returns the game [`MOST_KILLS`] picks, with its line.
async fn best_game(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Option<BestGame>> {
    let value = MOST_KILLS.value;
    let mut query = hero_games(
        "SELECT r.id AS replay_id, COALESCE(m.name, r.map) AS map, m.loading_screen,
             r.timestamp, r.duration, r.owner_win,
             CAST(COALESCE(json_extract(orp.score, '$.SoloKill'), 0) AS INTEGER) AS kills,
             CAST(COALESCE(json_extract(orp.score, '$.Deaths'), 0) AS INTEGER) AS deaths,
             CAST(COALESCE(json_extract(orp.score, '$.Assists'), 0) AS INTEGER) AS assists,
             CAST(COALESCE(json_extract(orp.score, '$.HeroDamage'), 0) AS INTEGER)
                 AS hero_damage",
        hero_id,
        filters,
    );
    query.push(format!(
        " JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         LEFT JOIN maps m ON m.id = r.map
         WHERE {value} > 0
         ORDER BY {value} DESC, r.timestamp DESC, r.id DESC
         LIMIT 1",
    ));
    query.build_query_as().fetch_optional(conn).await
}

/// Returns the owner's results per game length, split at [`LENGTH_CUTS`].
async fn lengths(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Vec<GameLength>> {
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
        filters,
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

/// Returns the hero most often on the owner's team, ties going to the latest game.
async fn ally(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Option<AllyHero>> {
    let mut query = hero_games(
        "SELECT h.id AS hero_id, h.name, COUNT(*) AS games",
        hero_id,
        filters,
    );
    query.push(
        " JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         JOIN replays_players ally
             ON ally.replay_id = r.id AND ally.team = orp.team
             AND ally.player_id != r.owner_player_id
         JOIN heroes h ON h.id = ally.hero_id
         GROUP BY h.id
         ORDER BY games DESC, MAX(r.timestamp) DESC, h.name
         LIMIT 1",
    );
    query.build_query_as().fetch_optional(conn).await
}

async fn win_streak(
    conn: &mut SqliteConnection,
    hero_id: i64,
    filters: &ReplayFilters,
) -> sqlx::Result<Option<WinStreak>> {
    let mut query = hero_games("SELECT r.owner_win, r.timestamp", hero_id, filters);
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
        a.replay_players[0].score =
            json!({"SoloKill": 4, "Takedowns": 10, "Deaths": 2, "HeroDamage": 1000});
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

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(detail.hero.name, "Wizard");

        let totals = &detail.totals;
        assert_eq!((totals.games, totals.wins, totals.losses), (3, 1, 1));
        assert_eq!((totals.takedowns, totals.deaths), (14, 5));
        assert_eq!(totals.avg_kills, Some(3.0));
        assert_eq!(totals.avg_hero_damage, Some(2000.0));
        assert_eq!(totals.avg_healing, None);
        assert_eq!(totals.avg_time_dead_secs, Some(30.0));
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

        assert_eq!(totals.last_played, DateTime::from_timestamp(400, 0));

        assert_eq!(
            talent_rows(&detail),
            [
                (1, "spark", 3, 1, 1),
                (2, "blink", 1, 0, 1),
                (2, "flare", 1, 1, 0),
                (2, "spark_moved", 1, 0, 0),
                (3, "nova", 0, 0, 0),
            ]
        );
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

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
        let bests = &detail.bests;
        assert_eq!(best(&bests.kills), Some((a, 4.0, "braxis_holdout")));
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

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
        let game = detail.best_game.unwrap();
        assert_eq!(game.replay_id, a);
        assert_eq!((game.map.as_str(), game.duration), ("braxis_holdout", 62));
        assert_eq!(game.owner_win, Some(true));
        assert_eq!(
            (game.kills, game.deaths, game.assists, game.hero_damage),
            (4, 2, 0, 1000)
        );
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

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
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

    #[tokio::test]
    async fn finds_the_most_common_ally_hero() {
        let pool = pool().await;
        let mut a = hero_game("a", 100, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        with_player(&mut a, "ally", 0, "Uther");
        with_player(&mut a, "enemy", 1, "Muradin");
        let mut b = hero_game("b", 200, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        with_player(&mut b, "ally", 0, "Tyrande");
        with_player(&mut b, "enemy", 1, "Muradin");
        let mut c = hero_game("c", 300, Mode::QuickMatch, "cursed_hollow", "Wizard", true);
        with_player(&mut c, "ally", 0, "Uther");
        with_player(&mut c, "enemy", 1, "Muradin");
        for game in [a, b, c] {
            insert_bundle(&pool, game).await.unwrap();
        }
        let wizard = wizard_id(&pool).await;

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
        let ally = detail.ally.unwrap();
        assert_eq!((ally.name.as_str(), ally.games), ("Uther", 2));
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

    fn trend_rows(detail: &HeroDetail) -> Vec<(&str, i64, i64, i64)> {
        detail
            .trend
            .points
            .iter()
            .map(|p| (p.start.as_str(), p.games, p.wins, p.losses))
            .collect()
    }

    #[tokio::test]
    async fn buckets_games_close_together_by_week() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(detail.trend.bucket, TrendBucket::Week);
        assert_eq!(detail.trend.points.len(), 1);
        assert_eq!(
            (detail.trend.points[0].games, detail.trend.points[0].wins),
            (3, 1)
        );
    }

    #[tokio::test]
    async fn buckets_games_spread_out_by_month() {
        let pool = pool().await;
        // Mid-month, so no time zone moves them to another month.
        let games = [
            ("a", 1_700_000_000, true),
            ("b", 1_700_100_000, false),
            ("c", 1_710_000_000, true),
        ];
        for (name, timestamp, win) in games {
            let game = hero_game(
                name,
                timestamp,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                win,
            );
            insert_bundle(&pool, game).await.unwrap();
        }
        let wizard = sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Wizard'")
            .fetch_one(&pool)
            .await
            .unwrap();

        let detail = hero_detail(&pool, wizard, &ReplayFilters::default())
            .await
            .unwrap()
            .unwrap();
        assert_eq!(detail.trend.bucket, TrendBucket::Month);
        assert_eq!(
            trend_rows(&detail),
            [("2023-11-01", 2, 1, 1), ("2024-03-01", 1, 1, 0)]
        );
    }

    #[tokio::test]
    async fn sums_up_only_the_games_matching_the_filters() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;

        let filters = ReplayFilters {
            modes: vec![Mode::QuickMatch],
            to: DateTime::from_timestamp(300, 0),
            ..Default::default()
        };
        let detail = hero_detail(&pool, wizard, &filters).await.unwrap().unwrap();
        assert_eq!(detail.totals.games, 1);
        assert_eq!(detail.awards.len(), 1);
        assert_eq!(detail.maps.len(), 1);
        assert_eq!(
            talent_rows(&detail),
            [
                (1, "spark", 1, 0, 0),
                (2, "spark_moved", 1, 0, 0),
                (2, "blink", 0, 0, 0),
                (2, "flare", 0, 0, 0),
                (3, "nova", 0, 0, 0),
            ]
        );
    }

    #[tokio::test]
    async fn returns_empty_stats_for_a_hero_without_games() {
        let pool = pool().await;
        let wizard = insert_games(&pool).await;

        let filters = ReplayFilters {
            modes: vec![Mode::StormLeague],
            ..Default::default()
        };
        let detail = hero_detail(&pool, wizard, &filters).await.unwrap().unwrap();
        assert_eq!(detail.totals.games, 0);
        assert_eq!(detail.totals.avg_kills, None);
        assert!(detail.maps.is_empty());
        assert!(detail.trend.points.is_empty());
        assert!(detail.bests.kills.is_none() && detail.bests.fastest_win.is_none());
        assert!(detail.best_game.is_none() && detail.ally.is_none());
        assert!(detail.lengths.iter().all(|length| length.games == 0));

        assert!(hero_detail(&pool, wizard + 100, &ReplayFilters::default())
            .await
            .unwrap()
            .is_none());
    }
}
