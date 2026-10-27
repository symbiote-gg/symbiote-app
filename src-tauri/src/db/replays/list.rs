use sqlx::{FromRow, QueryBuilder, Sqlite, SqliteConnection, SqliteExecutor, SqlitePool};

use crate::types::replay::{
    AwardInfo, ReplayCursor, ReplayFilters, ReplayPage, ReplayPlayerInfo, ReplaySort,
    ReplaySortColumn, ReplayWithPlayers,
};

/// Returns a page of the replays matching `filters`, in `sort` order, with how many
/// match, both read from the same snapshot so a replay ingested meanwhile can't make
/// them disagree.
pub async fn list_page(
    pool: &SqlitePool,
    filters: &ReplayFilters,
    sort: ReplaySort,
    after: Option<ReplayCursor>,
    limit: i64,
) -> sqlx::Result<ReplayPage> {
    let mut tx = pool.begin().await?;
    let replays = list_with_players(&mut tx, filters, sort, after, limit).await?;
    let total = count_filtered(&mut *tx, filters).await?;
    tx.commit().await?;
    Ok(ReplayPage { replays, total })
}

async fn count_filtered(
    executor: impl SqliteExecutor<'_>,
    filters: &ReplayFilters,
) -> sqlx::Result<i64> {
    let mut query = QueryBuilder::<Sqlite>::new("SELECT COUNT(*) FROM replays WHERE 1 = 1");
    push_filters(&mut query, filters);
    query.build_query_scalar().fetch_one(executor).await
}

/// Appends a condition per set field of `filters` to a `WHERE` clause over `replays`.
fn push_filters(query: &mut QueryBuilder<'_, Sqlite>, filters: &ReplayFilters) {
    push_in(query, " AND mode IN (", &filters.modes, ")");
    push_in(query, " AND map IN (", &filters.maps, ")");
    push_in(query, " AND owner_hero_id IN (", &filters.heroes, ")");
    push_in(
        query,
        " AND owner_hero_id IN (SELECT id FROM heroes WHERE role IN (",
        &filters.roles,
        "))",
    );
    if let Some(win) = filters.win {
        query.push(" AND owner_win = ").push_bind(win);
    }
    if let Some(from) = filters.from {
        query.push(" AND timestamp >= ").push_bind(from.timestamp());
    }
    if let Some(to) = filters.to {
        query.push(" AND timestamp < ").push_bind(to.timestamp());
    }
}

/// Appends `values` as a comma separated list between `prefix` and `suffix`, unless there
/// are no values.
fn push_in<'args, T>(
    query: &mut QueryBuilder<'args, Sqlite>,
    prefix: &str,
    values: &[T],
    suffix: &str,
) where
    T: 'args + Clone + sqlx::Encode<'args, Sqlite> + sqlx::Type<Sqlite>,
{
    if values.is_empty() {
        return;
    }
    query.push(prefix);
    let mut list = query.separated(", ");
    for value in values {
        list.push_bind(value.clone());
    }
    list.push_unseparated(suffix);
}

/// The owner's hero damage, over a row of `replays`. The only sort key that can be null.
const OWNER_HERO_DAMAGE: &str = "(SELECT json_extract(score, '$.HeroDamage')
     FROM replays_players
     WHERE replay_id = replays.id AND player_id = replays.owner_player_id)";

/// The value `column` sorts replays by, over a row of `replays`.
fn sort_key(column: ReplaySortColumn) -> &'static str {
    match column {
        ReplaySortColumn::Played => "timestamp",
        ReplaySortColumn::GameTime => "duration",
        ReplaySortColumn::HeroDamage => OWNER_HERO_DAMAGE,
    }
}

/// Orders by the sort key `key`, then by `id` to break ties, both in `sort`'s
/// direction. Replays without a key go last either way.
fn order_by(sort: ReplaySort, key: &str, id: &str) -> String {
    let dir = if sort.desc { "DESC" } else { "ASC" };
    let nulls = if sort.column == ReplaySortColumn::HeroDamage {
        format!("{key} IS NULL, ")
    } else {
        String::new()
    };
    format!(" ORDER BY {nulls}{key} {dir}, {id} {dir}")
}

/// Appends a condition keeping only the replays `sort` lists after `cursor`.
fn push_after(query: &mut QueryBuilder<'_, Sqlite>, sort: ReplaySort, cursor: ReplayCursor) {
    let key = sort_key(sort.column);
    let op = if sort.desc { "<" } else { ">" };
    match cursor.value {
        Some(value) => {
            query
                .push(format!(" AND (({key}, id) {op} ("))
                .push_bind(value)
                .push(", ")
                .push_bind(cursor.id)
                .push(")");
            if sort.column == ReplaySortColumn::HeroDamage {
                query.push(format!(" OR {key} IS NULL"));
            }
            query.push(")");
        }
        None => {
            query
                .push(format!(" AND {key} IS NULL AND id {op} "))
                .push_bind(cursor.id);
        }
    }
}

/// Games the owner needs on a hero before any of them counts as a top damage game.
const TOP_DAMAGE_MIN_GAMES: i64 = 10;
/// Percent rank among the owner's games on a hero from which hero damage counts as top.
const TOP_DAMAGE_RANK: f64 = 0.9;

/// Builds the query listing each replay picked by the subquery over `replays` that
/// `push_source` appends, with its owner's hero and stats, in `sort` order.
///
/// `push_source` continues a `SELECT ... WHERE 1 = 1` that also selects the replay's
/// sort key as `sort_key`.
///
/// Hero damage is ranked against all of the owner's games on the same hero, not only
/// the listed ones.
fn list_rows_query<'args>(
    sort: ReplaySort,
    push_source: impl FnOnce(&mut QueryBuilder<'args, Sqlite>),
) -> QueryBuilder<'args, Sqlite> {
    let mut query = QueryBuilder::new(format!(
        "SELECT r.id, r.hash, r.path, r.ingest_date, r.timestamp, r.mode, r.map, r.owner_hero_id,
             COALESCE(m.name, r.map) AS map_name, m.loading_screen AS map_loading_screen,
             r.owner_player_id, orp.slot AS owner_slot, orp.team AS owner_team, r.owner_win,
             r.duration, r.is_new, h.name AS hero_name, h.role AS hero_role,
             h.portrait AS hero_portrait,
             json_extract(orp.score, '$.SoloKill') AS owner_kills,
             json_extract(orp.score, '$.Deaths') AS owner_deaths,
             json_extract(orp.score, '$.Assists') AS owner_assists,
             json_extract(orp.score, '$.Takedowns') AS owner_takedowns,
             json_extract(orp.score, '$.HeroDamage') AS owner_hero_damage,
             COALESCE(dr.hero_games >= {TOP_DAMAGE_MIN_GAMES}
                 AND dr.damage_rank >= {TOP_DAMAGE_RANK}, 0) AS owner_hero_damage_top
         FROM (SELECT *, {key} AS sort_key FROM replays WHERE 1 = 1",
        key = sort_key(sort.column),
    ));
    push_source(&mut query);
    query.push(
        ") r
         JOIN heroes h ON h.id = r.owner_hero_id
         LEFT JOIN maps m ON m.id = r.map
         JOIN replays_players orp
             ON orp.replay_id = r.id AND orp.player_id = r.owner_player_id
         LEFT JOIN (
             SELECT hr.id,
                 PERCENT_RANK() OVER (PARTITION BY hr.owner_hero_id
                     ORDER BY json_extract(hrp.score, '$.HeroDamage')) AS damage_rank,
                 COUNT(*) OVER (PARTITION BY hr.owner_hero_id) AS hero_games
             FROM replays hr
             JOIN replays_players hrp
                 ON hrp.replay_id = hr.id AND hrp.player_id = hr.owner_player_id
             WHERE json_extract(hrp.score, '$.HeroDamage') IS NOT NULL
         ) dr ON dr.id = r.id",
    );
    query.push(order_by(sort, "r.sort_key", "r.id"));
    query
}

/// Returns a page of the replays matching `filters`, in `sort` order, each with its
/// owner's hero, stats and players.
///
/// Pages by position rather than offset, so a replay ingested between two pages can't
/// shift the second one and repeat a replay of the first.
async fn list_with_players(
    conn: &mut SqliteConnection,
    filters: &ReplayFilters,
    sort: ReplaySort,
    after: Option<ReplayCursor>,
    limit: i64,
) -> sqlx::Result<Vec<ReplayWithPlayers>> {
    let mut query = list_rows_query(sort, |source| {
        push_filters(source, filters);
        if let Some(cursor) = after {
            push_after(source, sort, cursor);
        }
        source
            .push(order_by(sort, "sort_key", "id"))
            .push(" LIMIT ")
            .push_bind(limit);
    });
    let mut replays = query
        .build_query_as::<ReplayWithPlayers>()
        .fetch_all(&mut *conn)
        .await?;
    attach_players(conn, &mut replays).await?;
    attach_owner_awards(conn, &mut replays).await?;
    Ok(replays)
}

/// Returns a replay as listed by [`list_page`], or `None` if it doesn't exist.
pub async fn get_list_row(pool: &SqlitePool, id: i64) -> sqlx::Result<Option<ReplayWithPlayers>> {
    let mut query = list_rows_query(ReplaySort::default(), |source| {
        source.push(" AND id = ").push_bind(id);
    });
    let mut conn = pool.acquire().await?;
    let mut replays = query
        .build_query_as::<ReplayWithPlayers>()
        .fetch_all(&mut *conn)
        .await?;
    attach_players(&mut conn, &mut replays).await?;
    attach_owner_awards(&mut conn, &mut replays).await?;
    Ok(replays.pop())
}

#[derive(FromRow)]
struct ReplayPlayerInfoRow {
    replay_id: i64,
    #[sqlx(flatten)]
    player: ReplayPlayerInfo,
}

/// Fills in each replay's players, by slot.
async fn attach_players(
    conn: &mut SqliteConnection,
    replays: &mut [ReplayWithPlayers],
) -> sqlx::Result<()> {
    if replays.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Sqlite>::new(
        "SELECT rp.replay_id, rp.player_id, p.name, rp.slot, rp.team, rp.hero_id,
             h.name AS hero_name, h.portrait AS hero_portrait
         FROM replays_players rp
         JOIN players p ON p.id = rp.player_id
         JOIN heroes h ON h.id = rp.hero_id
         WHERE rp.replay_id IN (",
    );
    let mut ids = query.separated(", ");
    for replay in replays.iter() {
        ids.push_bind(replay.replay.id);
    }
    ids.push_unseparated(") ORDER BY rp.slot");
    let rows = query
        .build_query_as::<ReplayPlayerInfoRow>()
        .fetch_all(&mut *conn)
        .await?;
    for row in rows {
        if let Some(replay) = replays.iter_mut().find(|r| r.replay.id == row.replay_id) {
            replay.players.push(row.player);
        }
    }
    Ok(())
}

#[derive(FromRow)]
struct ReplayAwardRow {
    replay_id: i64,
    #[sqlx(flatten)]
    award: AwardInfo,
}

/// Fills in the awards each replay's owner got, MVP first.
async fn attach_owner_awards(
    conn: &mut SqliteConnection,
    replays: &mut [ReplayWithPlayers],
) -> sqlx::Result<()> {
    if replays.is_empty() {
        return Ok(());
    }
    let mut query = QueryBuilder::<Sqlite>::new(
        "SELECT rpa.replay_id, rpa.award, a.name, a.description, a.icon
         FROM replays_players_awards rpa
         JOIN replays r ON r.id = rpa.replay_id AND r.owner_player_id = rpa.player_id
         LEFT JOIN awards a ON a.id = rpa.award
         WHERE rpa.replay_id IN (",
    );
    let mut ids = query.separated(", ");
    for replay in replays.iter() {
        ids.push_bind(replay.replay.id);
    }
    ids.push_unseparated(") ORDER BY rpa.award = 'mvp' DESC, rpa.award");
    let rows = query
        .build_query_as::<ReplayAwardRow>()
        .fetch_all(&mut *conn)
        .await?;
    for row in rows {
        if let Some(replay) = replays.iter_mut().find(|r| r.replay.id == row.replay_id) {
            replay.owner_awards.push(row.award);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use chrono::DateTime;

    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::test_utils::pool;
    use crate::types::hero::{Hero, HeroRole};
    use crate::types::replay::{Mode, NewReplayBundle};

    fn cursor(replay: &ReplayWithPlayers) -> ReplayCursor {
        ReplayCursor {
            value: Some(replay.replay.timestamp.timestamp()),
            id: replay.replay.id,
        }
    }

    fn hashes(page: &ReplayPage) -> Vec<&str> {
        page.replays
            .iter()
            .map(|r| r.replay.hash.as_str())
            .collect()
    }

    #[tokio::test]
    async fn pages_from_the_last_listed_replay() {
        let pool = pool().await;
        insert_game(&pool, "a", 300).await;
        insert_game(&pool, "b", 200).await;
        insert_game(&pool, "c", 200).await;
        insert_game(&pool, "d", 100).await;

        let first = list_page(
            &pool,
            &ReplayFilters::default(),
            ReplaySort::default(),
            None,
            2,
        )
        .await
        .unwrap();
        assert_eq!(hashes(&first), [hex("a"), hex("c")]);

        // A newer replay ingested between pages must not shift the next one.
        insert_game(&pool, "e", 400).await;
        let second = list_page(
            &pool,
            &ReplayFilters::default(),
            ReplaySort::default(),
            Some(cursor(&first.replays[1])),
            2,
        )
        .await
        .unwrap();
        assert_eq!(hashes(&second), [hex("b"), hex("d")]);
        assert_eq!(second.total, 5);
    }

    fn hero_game(
        name: &str,
        timestamp: i64,
        mode: Mode,
        map: &str,
        hero: &str,
        win: bool,
    ) -> NewReplayBundle {
        let mut game = bundle(name, 1000);
        game.replay.game_id = hex(name);
        game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
        game.replay.mode = mode;
        game.replay.map = map.to_owned();
        game.replay.owner_hero_slug = hero.to_owned();
        game.replay.owner_win = Some(win);
        game.heroes = vec![Hero {
            slug: hero.to_owned(),
            name: hero.to_owned(),
        }];
        game.replay_players[0].hero_slug = hero.to_owned();
        game
    }

    async fn insert_hero_games(pool: &SqlitePool) {
        for game in [
            hero_game("a", 400, Mode::Aram, "braxis_holdout", "Wizard", true),
            hero_game(
                "b",
                300,
                Mode::QuickMatch,
                "cursed_hollow",
                "Tyrande",
                false,
            ),
            hero_game(
                "c",
                200,
                Mode::QuickMatch,
                "braxis_holdout",
                "Wizard",
                false,
            ),
            hero_game(
                "d",
                100,
                Mode::StormLeague,
                "towers_of_doom",
                "Tyrande",
                true,
            ),
        ] {
            insert_bundle(pool, game).await.unwrap();
        }
        sqlx::query("UPDATE heroes SET role = 'healer' WHERE slug = 'Tyrande'")
            .execute(pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn lists_only_the_replays_matching_the_filters() {
        let pool = pool().await;
        insert_hero_games(&pool).await;
        let wizard: i64 = sqlx::query_scalar("SELECT id FROM heroes WHERE slug = 'Wizard'")
            .fetch_one(&pool)
            .await
            .unwrap();

        let cases = [
            (
                ReplayFilters {
                    modes: vec![Mode::QuickMatch, Mode::StormLeague],
                    ..Default::default()
                },
                vec!["b", "c", "d"],
            ),
            (
                ReplayFilters {
                    maps: vec!["braxis_holdout".to_owned(), "towers_of_doom".to_owned()],
                    ..Default::default()
                },
                vec!["a", "c", "d"],
            ),
            (
                ReplayFilters {
                    heroes: vec![wizard],
                    ..Default::default()
                },
                vec!["a", "c"],
            ),
            (
                ReplayFilters {
                    roles: vec![HeroRole::Healer],
                    ..Default::default()
                },
                vec!["b", "d"],
            ),
            (
                ReplayFilters {
                    win: Some(false),
                    ..Default::default()
                },
                vec!["b", "c"],
            ),
            (
                ReplayFilters {
                    from: DateTime::from_timestamp(200, 0),
                    to: DateTime::from_timestamp(400, 0),
                    ..Default::default()
                },
                vec!["b", "c"],
            ),
            (
                ReplayFilters {
                    modes: vec![Mode::QuickMatch],
                    heroes: vec![wizard],
                    win: Some(false),
                    ..Default::default()
                },
                vec!["c"],
            ),
        ];
        for (filters, expected) in cases {
            let page = list_page(&pool, &filters, ReplaySort::default(), None, 50)
                .await
                .unwrap();
            let expected: Vec<String> = expected.into_iter().map(hex).collect();
            assert_eq!(hashes(&page), expected, "{filters:?}");
            assert_eq!(page.total, expected.len() as i64, "{filters:?}");
        }
    }

    #[tokio::test]
    async fn pages_through_the_filtered_replays() {
        let pool = pool().await;
        insert_hero_games(&pool).await;
        let filters = ReplayFilters {
            roles: vec![HeroRole::Healer],
            ..Default::default()
        };

        let first = list_page(&pool, &filters, ReplaySort::default(), None, 1)
            .await
            .unwrap();
        assert_eq!(hashes(&first), [hex("b")]);
        let second = list_page(
            &pool,
            &filters,
            ReplaySort::default(),
            Some(cursor(&first.replays[0])),
            1,
        )
        .await
        .unwrap();
        assert_eq!(hashes(&second), [hex("d")]);
        assert_eq!(second.total, 2);
    }

    async fn insert_sort_game(
        pool: &SqlitePool,
        game_id: &str,
        timestamp: i64,
        duration: i64,
        hero_damage: Option<i64>,
    ) {
        let mut game = bundle(game_id, duration * 16);
        game.replay.game_id = hex(game_id);
        game.replay.timestamp = DateTime::from_timestamp(timestamp, 0).unwrap();
        if let Some(hero_damage) = hero_damage {
            game.replay_players[0].score = serde_json::json!({ "HeroDamage": hero_damage });
        }
        insert_bundle(pool, game).await.unwrap();
    }

    fn sort_cursor(replay: &ReplayWithPlayers, column: ReplaySortColumn) -> ReplayCursor {
        let value = match column {
            ReplaySortColumn::Played => Some(replay.replay.timestamp.timestamp()),
            ReplaySortColumn::GameTime => Some(replay.replay.duration),
            ReplaySortColumn::HeroDamage => replay.owner_stats.owner_hero_damage,
        };
        ReplayCursor {
            value,
            id: replay.replay.id,
        }
    }

    #[tokio::test]
    async fn sorts_and_pages_by_each_column() {
        let pool = pool().await;
        insert_sort_game(&pool, "a", 100, 100, Some(5000)).await;
        insert_sort_game(&pool, "b", 200, 200, None).await;
        insert_sort_game(&pool, "c", 300, 100, Some(9000)).await;
        insert_sort_game(&pool, "d", 400, 300, Some(5000)).await;
        insert_sort_game(&pool, "e", 500, 150, None).await;

        // Ties break by id in the same direction, and games without hero damage go last.
        let cases = [
            (ReplaySortColumn::Played, true, ["e", "d", "c", "b", "a"]),
            (ReplaySortColumn::Played, false, ["a", "b", "c", "d", "e"]),
            (ReplaySortColumn::GameTime, true, ["d", "b", "e", "c", "a"]),
            (ReplaySortColumn::GameTime, false, ["a", "c", "e", "b", "d"]),
            (
                ReplaySortColumn::HeroDamage,
                true,
                ["c", "d", "a", "e", "b"],
            ),
            (
                ReplaySortColumn::HeroDamage,
                false,
                ["a", "d", "c", "b", "e"],
            ),
        ];
        for (column, desc, expected) in cases {
            let sort = ReplaySort { column, desc };
            let mut listed = Vec::new();
            let mut after = None;
            loop {
                let page = list_page(&pool, &ReplayFilters::default(), sort, after, 2)
                    .await
                    .unwrap();
                let Some(tail) = page.replays.last() else {
                    break;
                };
                after = Some(sort_cursor(tail, column));
                listed.extend(page.replays.iter().map(|r| r.replay.hash.clone()));
            }
            let expected: Vec<String> = expected.into_iter().map(hex).collect();
            assert_eq!(listed, expected, "{sort:?}");
        }
    }

    async fn insert_damage_game(pool: &SqlitePool, game_id: &str, hero_damage: i64) {
        let mut game = bundle(game_id, 1000);
        game.replay.game_id = hex(game_id);
        game.replay_players[0].score = serde_json::json!({ "HeroDamage": hero_damage });
        game.replay_players[0].awards = vec!["mvp".to_owned(), "escape_artist".to_owned()];
        insert_bundle(pool, game).await.unwrap();
    }

    fn top_damage_hashes(page: &ReplayPage) -> Vec<&str> {
        page.replays
            .iter()
            .filter(|r| r.owner_stats.owner_hero_damage_top)
            .map(|r| r.replay.hash.as_str())
            .collect()
    }

    #[tokio::test]
    async fn lists_owner_awards_and_top_damage_games() {
        let pool = pool().await;
        for game in 1..TOP_DAMAGE_MIN_GAMES {
            insert_damage_game(&pool, &format!("g{game}"), game * 1000).await;
        }

        let page = list_page(
            &pool,
            &ReplayFilters::default(),
            ReplaySort::default(),
            None,
            50,
        )
        .await
        .unwrap();
        assert!(top_damage_hashes(&page).is_empty(), "too few games to rank");
        let awards: Vec<&str> = page.replays[0]
            .owner_awards
            .iter()
            .map(|a| a.award.as_str())
            .collect();
        assert_eq!(awards, ["mvp", "escape_artist"]);

        insert_damage_game(&pool, "best", 100_000).await;
        let page = list_page(
            &pool,
            &ReplayFilters::default(),
            ReplaySort::default(),
            None,
            50,
        )
        .await
        .unwrap();
        assert_eq!(top_damage_hashes(&page), [hex("best")]);
    }
}
