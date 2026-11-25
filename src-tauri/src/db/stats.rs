use chrono::{DateTime, Utc};
use sqlx::{SqliteConnection, SqlitePool};

use crate::db::hero_stats;
use crate::db::scope::Scope;
use crate::profile_score;
use crate::rating::PlayerGame;
use crate::session_bests::{self, BestGame};
use crate::types::hero::HeroRole;
use crate::types::replay::Mode;
use crate::types::stats::{
    HeroStat, MapStat, MostPlayedHeroes, PartySize, ProfileBests, ProfileCareer, ProfileScore,
    RecentForm, RoleRecord, ScoreScope, ScoredHero, SessionBest, SessionGame, SessionHero,
    SessionRecord,
};

/// Sums up the owner's career across every hero, with who they play as.
///
/// All the figures are read from the same snapshot, so they agree with each other.
pub async fn profile_career(pool: &SqlitePool) -> sqlx::Result<ProfileCareer> {
    let mut tx = pool.begin().await?;

    // The owner can play on several accounts; the header names the one with the most
    // replays.
    let identity: Option<(String, Option<i64>)> = sqlx::query_as(
        "SELECT p.name, p.account_level
         FROM replays r
         JOIN players p ON p.id = r.owner_player_id
         GROUP BY p.id
         ORDER BY COUNT(*) DESC, p.id
         LIMIT 1",
    )
    .fetch_optional(&mut *tx)
    .await?;
    let (name, account_level) = identity.unzip();

    let totals = hero_stats::totals(&mut tx, Scope::career()).await?;
    let mvps = mvps(&mut tx).await?;
    let main_role = main_role(&mut tx).await?;
    tx.commit().await?;

    Ok(ProfileCareer {
        name,
        account_level: account_level.flatten(),
        totals,
        mvps,
        main_role,
    })
}

/// Returns the owner's bests in the scope's modes across every hero, all read from the
/// same snapshot.
pub async fn profile_bests(pool: &SqlitePool, scope: ScoreScope) -> sqlx::Result<ProfileBests> {
    let mut tx = pool.begin().await?;
    let bests = hero_stats::profile_bests(&mut tx, scope).await?;
    tx.commit().await?;

    Ok(bests)
}

async fn mvps(conn: &mut SqliteConnection) -> sqlx::Result<i64> {
    let mut query = Scope::career().owner_games("SELECT COUNT(*)");
    query.push(
        " JOIN games_players_awards a
             ON a.game_id = r.game_id AND a.player_id = r.owner_player_id
         WHERE a.award = 'mvp'",
    );
    query.build_query_scalar().fetch_one(conn).await
}

/// The role the owner played the most games as.
async fn main_role(conn: &mut SqliteConnection) -> sqlx::Result<Option<HeroRole>> {
    let mut query = Scope::career().owner_games("SELECT h.role");
    query.push(
        " JOIN heroes h ON h.id = r.owner_hero_id
         WHERE h.role IS NOT NULL
         GROUP BY h.role
         ORDER BY COUNT(*) DESC
         LIMIT 1",
    );
    query.build_query_scalar().fetch_optional(conn).await
}

/// Every player of the games in `scope`, a game's players together and the games in
/// the order played. A player is the owner in the games they have a replay of.
async fn scored_players(
    conn: &mut SqliteConnection,
    scope: Scope,
) -> sqlx::Result<Vec<PlayerGame>> {
    let mut query = sqlx::QueryBuilder::new(
        "SELECT g.id AS game_id, g.timestamp, g.duration, gp.team, gp.hero_id, h.slug AS hero_slug,
             h.role AS hero_role,
             gp.takedowns AS takedowns,
             gp.deaths AS deaths,
             gp.hero_damage AS hero_damage,
             gp.siege_damage AS siege_damage,
             gp.healing AS healing,
             gp.damage_taken AS damage_taken,
             gp.teamfight_damage_taken AS teamfight_damage_taken,
             gp.teamfight_hero_damage AS teamfight_hero_damage,
             gp.xp_contribution AS xp,
             CASE WHEN gp.time_stunning IS NULL
                     AND gp.time_rooting IS NULL
                     AND gp.time_silencing IS NULL
                 THEN NULL
                 ELSE COALESCE(gp.time_stunning, 0)
                     + COALESCE(gp.time_rooting, 0)
                     + COALESCE(gp.time_silencing, 0)
             END AS hard_cc,
             gp.protection AS protection,
             gp.time_dead_secs,
             gp.merc_camp_captures AS merc_captures,
             EXISTS (
                 SELECT 1 FROM replays r
                 WHERE r.game_id = g.id AND r.owner_player_id = gp.player_id
             ) AS is_owner,
             p.toon LIKE 'ai-%' AS is_ai
         FROM games g
         JOIN games_players gp ON gp.game_id = g.id
         JOIN players p ON p.id = gp.player_id
         JOIN heroes h ON h.id = gp.hero_id
         WHERE g.id IN (",
    );
    scope.push_game_ids(&mut query);

    query
        .push(") ORDER BY g.timestamp, g.id")
        .build_query_as::<PlayerGame>()
        .fetch_all(conn)
        .await
}

/// Scores the owner's latest games in the scope's modes against the other players
/// in them.
pub async fn profile_score(
    pool: &SqlitePool,
    scope: ScoreScope,
    session_start: DateTime<Utc>,
) -> sqlx::Result<ProfileScore> {
    let mut tx = pool.begin().await?;
    let players = scored_players(&mut tx, Scope::of(scope)).await?;
    let heroes = sqlx::query_as::<_, ScoredHero>("SELECT id, name, role, portrait FROM heroes")
        .fetch_all(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(profile_score::compute(&players, heroes, session_start))
}

/// The owner's games in the scope's modes in the four weeks up to `now` against the
/// four before, ranked among their own games.
pub async fn recent_form(
    pool: &SqlitePool,
    scope: ScoreScope,
    now: DateTime<Utc>,
) -> sqlx::Result<RecentForm> {
    let mut conn = pool.acquire().await?;
    let players = scored_players(&mut conn, Scope::of(scope)).await?;

    Ok(crate::recent_form::compute(&players, now))
}

/// The owner's games ended since `session_start`, by hero and one by one, beside
/// the career they add to.
///
/// All the figures are read from the same snapshot, so they agree with each other.
pub async fn session_record(
    pool: &SqlitePool,
    session_start: DateTime<Utc>,
) -> sqlx::Result<SessionRecord> {
    let mut tx = pool.begin().await?;

    let (career_wins, career_losses): (i64, i64) = Scope::career()
        .owner_games("SELECT COALESCE(SUM(r.owner_win = 1), 0), COALESCE(SUM(r.owner_win = 0), 0)")
        .build_query_as()
        .fetch_one(&mut *tx)
        .await?;

    let session = Scope::ended_since_sql(session_start);
    let mut query = Scope::career().owner_games(&format!(
        "SELECT h.id AS hero_id, h.name, h.portrait, h.accent,
             SUM({session}) AS games,
             COALESCE(SUM(r.owner_win = 1 AND {session}), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0 AND {session}), 0) AS losses,
             COALESCE(SUM(r.owner_win = 1), 0) AS career_wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS career_losses"
    ));
    query.push(
        " JOIN heroes h ON h.id = r.owner_hero_id
         GROUP BY h.id
         HAVING games > 0
         ORDER BY games DESC, h.name",
    );
    let heroes = query
        .build_query_as::<SessionHero>()
        .fetch_all(&mut *tx)
        .await?;

    let mut query = Scope::career().ended_since(session_start).owner_games(
        "SELECT r.id AS replay_id, r.game_id, r.timestamp, r.duration,
             h.id AS hero_id, h.name AS hero, h.portrait,
             COALESCE(m.name, r.map) AS map,
             r.owner_win AS win,
             EXISTS (
                 SELECT 1 FROM games_players_awards a
                 WHERE a.game_id = r.game_id
                     AND a.player_id = r.owner_player_id
                     AND a.award = 'mvp'
             ) AS mvp",
    );
    query.push(
        " JOIN heroes h ON h.id = r.owner_hero_id
         LEFT JOIN maps m ON m.id = r.map
         ORDER BY r.timestamp DESC, r.id DESC",
    );
    let games = query
        .build_query_as::<SessionGame>()
        .fetch_all(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(SessionRecord {
        started: session_start,
        wins: heroes.iter().map(|hero| hero.wins).sum(),
        losses: heroes.iter().map(|hero| hero.losses).sum(),
        duration: games.iter().map(|game| game.duration).sum(),
        career_wins,
        career_losses,
        heroes,
        games,
    })
}

/// Returns the bests the owner beat with the games ended since `session_start`.
pub async fn session_bests(
    pool: &SqlitePool,
    session_start: DateTime<Utc>,
) -> sqlx::Result<Vec<SessionBest>> {
    let mut tx = pool.begin().await?;

    // Skips reading the whole career while no game was played yet.
    let mut query = Scope::career()
        .ended_since(session_start)
        .owner_games("SELECT 1");
    query.push(" LIMIT 1");
    let played: Option<i64> = query.build_query_scalar().fetch_optional(&mut *tx).await?;
    if played.is_none() {
        return Ok(Vec::new());
    }

    let mut query = Scope::career().owner_games(
        "SELECT r.id AS replay_id, h.id AS hero_id, h.name AS hero, h.slug AS hero_slug,
             h.role = 'healer' AS healer, r.mode, r.timestamp, r.duration, r.owner_win AS win,
             orp.hero_damage, orp.siege_damage, orp.healing, orp.damage_taken,
             orp.xp_contribution AS xp, orp.takedowns, orp.deaths",
    );
    query.push(
        " JOIN heroes h ON h.id = r.owner_hero_id
         ORDER BY r.timestamp, r.id",
    );
    let games = query
        .build_query_as::<BestGame>()
        .fetch_all(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(session_bests::compute(&games, session_start))
}

/// Returns the `limit` heroes the owner played the most, with how many heroes they
/// played overall.
pub async fn most_played_heroes(pool: &SqlitePool, limit: i64) -> sqlx::Result<MostPlayedHeroes> {
    let mut tx = pool.begin().await?;
    let played: i64 = Scope::career()
        .owner_games("SELECT COUNT(DISTINCT r.owner_hero_id)")
        .build_query_scalar()
        .fetch_one(&mut *tx)
        .await?;
    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM heroes")
        .fetch_one(&mut *tx)
        .await?;

    let mut query = Scope::career().owner_games(
        "SELECT h.id AS hero_id, h.name, h.role, h.portrait,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses",
    );
    query
        .push(
            " JOIN heroes h ON h.id = r.owner_hero_id
             GROUP BY h.id
             ORDER BY games DESC, wins DESC, h.name
             LIMIT ",
        )
        .push_bind(limit);
    let heroes = query
        .build_query_as::<HeroStat>()
        .fetch_all(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(MostPlayedHeroes {
        played,
        total,
        heroes,
    })
}

/// Returns the modes the owner has played.
pub async fn played_modes(pool: &SqlitePool) -> sqlx::Result<Vec<Mode>> {
    Scope::career()
        .owner_games("SELECT DISTINCT r.mode")
        .build_query_scalar()
        .fetch_all(pool)
        .await
}

/// Returns the maps the owner has played on, by name, with how many games on each.
pub async fn played_maps(pool: &SqlitePool) -> sqlx::Result<Vec<MapStat>> {
    let mut query = Scope::career().owner_games(
        "SELECT r.map AS id, COALESCE(m.name, r.map) AS name, m.loading_screen,
             COUNT(*) AS games",
    );
    query.push(
        " LEFT JOIN maps m ON m.id = r.map
         GROUP BY r.map
         ORDER BY name",
    );
    query.build_query_as::<MapStat>().fetch_all(pool).await
}

const MAX_PARTY: i64 = 5;

/// Returns the owner's games in the scope's modes by party size, from solo to a full
/// stack, sizes they never played at included with no games.
pub async fn party_sizes(pool: &SqlitePool, scope: ScoreScope) -> sqlx::Result<Vec<PartySize>> {
    // The parser numbers each game's parties itself, so the owner's party is the team
    // mates sharing their number in that game.
    let mut query = Scope::of(scope).owner_games(
        "SELECT CASE WHEN r.owner_party_num IS NULL THEN 1 ELSE (
                 SELECT COUNT(*) FROM games_players gp
                 WHERE gp.game_id = r.game_id AND gp.team = r.owner_team
                     AND gp.party = r.owner_party_num)
             END AS size,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses",
    );

    let played = query
        .push(" GROUP BY size")
        .build_query_as::<PartySize>()
        .fetch_all(pool)
        .await?;

    let mut sizes: Vec<_> = (1..=MAX_PARTY)
        .map(|size| PartySize {
            size,
            games: 0,
            wins: 0,
            losses: 0,
        })
        .collect();

    for party in played {
        if let Some(slot) = usize::try_from(party.size - 1)
            .ok()
            .and_then(|index| sizes.get_mut(index))
        {
            *slot = party;
        }
    }

    Ok(sizes)
}

/// Returns the owner's games in the scope's modes by role, roles they never played
/// included with no games.
pub async fn role_records(pool: &SqlitePool, scope: ScoreScope) -> sqlx::Result<Vec<RoleRecord>> {
    let mut query = Scope::of(scope).owner_games(
        "SELECT h.role,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses",
    );

    let played = query
        .push(
            " JOIN heroes h ON h.id = r.owner_hero_id
             WHERE h.role IS NOT NULL
             GROUP BY h.role",
        )
        .build_query_as::<RoleRecord>()
        .fetch_all(pool)
        .await?;

    let mut records: Vec<_> = HeroRole::ALL
        .into_iter()
        .map(|role| RoleRecord {
            role,
            games: 0,
            wins: 0,
            losses: 0,
        })
        .collect();

    for record in played {
        if let Some(slot) = records.iter_mut().find(|slot| slot.role == record.role) {
            *slot = record;
        }
    }

    Ok(records)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::test_utils::{pool, seeded_pool, GameBuilder};
    use crate::types::player::Player;
    use crate::types::replay::{NewReplayPlayer, NewScore};
    use crate::types::stats::BestMetric;

    #[tokio::test]
    async fn profile_career_starts_empty() {
        let pool = pool().await;

        let career = profile_career(&pool).await.unwrap();
        assert_eq!(career.name, None);
        assert_eq!(career.account_level, None);
        assert_eq!(career.totals.games, 0);
        assert_eq!(career.totals.total_duration, 0);
        assert_eq!(career.mvps, 0);
        assert_eq!(career.main_role, None);
    }

    #[tokio::test]
    async fn profile_career_sums_every_account_and_names_the_most_played() {
        let pool = pool().await;
        let alt = |name: &str, timestamp| {
            let mut game = hero_game(
                name,
                timestamp,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                false,
            );
            game.replay.owner_toon = "alt".to_owned();
            game.players[0] = Player {
                toon: "alt".to_owned(),
                name: "Alt".to_owned(),
                account_level: Some(812),
            };
            game.replay_players[0].toon = "alt".to_owned();
            game.replay_players[0].awards = vec![];
            game
        };

        for game in [
            hero_game(
                "main",
                1000,
                Mode::QuickMatch,
                "cursed_hollow",
                "Tyrande",
                true,
            ),
            alt("alt-1", 2000),
            alt("alt-2", 3000),
        ] {
            insert_bundle(&pool, game).await.unwrap();
        }

        let career = profile_career(&pool).await.unwrap();
        assert_eq!(career.name.as_deref(), Some("Alt"));
        assert_eq!(career.account_level, Some(812));
        assert_eq!(
            (
                career.totals.games,
                career.totals.wins,
                career.totals.losses
            ),
            (3, 1, 2)
        );
        assert_eq!(career.mvps, 1);
    }

    #[tokio::test]
    async fn party_sizes_count_the_owners_party_on_their_team() {
        let pool = pool().await;
        let player = |toon: &str, slot, team, party| NewReplayPlayer {
            toon: toon.to_owned(),
            slot,
            team,
            hero_slug: "Wizard".to_owned(),
            time_dead_secs: None,
            time_on_fire_secs: None,
            upvotes: 0,
            party,
            xp: None,
            score: NewScore::default(),
            talents: vec![],
            awards: vec![],
        };
        let duo = |name: &str, timestamp, win| {
            let mut game = hero_game(
                name,
                timestamp,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                win,
            );
            game.replay_players[0].party = Some(1);
            for (toon, slot, team, party) in [
                ("mate", 2, 0, Some(1)),
                ("enemy-1", 6, 1, Some(2)),
                ("enemy-2", 7, 1, Some(2)),
            ] {
                game.players.push(Player {
                    toon: toon.to_owned(),
                    name: toon.to_owned(),
                    account_level: None,
                });
                game.replay_players.push(player(toon, slot, team, party));
            }
            game
        };
        let mut undecided = duo("undecided", 3000, true);
        undecided.replay.winner_team = None;

        for game in [
            hero_game(
                "solo",
                1000,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                false,
            ),
            duo("duo-won", 2000, true),
            undecided,
        ] {
            insert_bundle(&pool, game).await.unwrap();
        }

        let sizes: Vec<_> = party_sizes(&pool, ScoreScope::All)
            .await
            .unwrap()
            .iter()
            .map(|party| (party.size, party.games, party.wins, party.losses))
            .collect();
        assert_eq!(
            sizes,
            [
                (1, 1, 0, 1),
                (2, 2, 1, 0),
                (3, 0, 0, 0),
                (4, 0, 0, 0),
                (5, 0, 0, 0)
            ]
        );
    }

    #[tokio::test]
    async fn party_sizes_count_the_scopes_games() {
        let pool = pool().await;
        let game = |name: &str, timestamp, mode, win| {
            hero_game(name, timestamp, mode, "cursed_hollow", "Wizard", win)
        };

        for game in [
            game("quick", 1000, Mode::QuickMatch, true),
            game("draft", 2000, Mode::StormLeague, false),
            game("aram", 3000, Mode::Aram, true),
        ] {
            insert_bundle(&pool, game).await.unwrap();
        }

        let solo = |sizes: Vec<PartySize>| {
            let solo = &sizes[0];
            (solo.size, solo.games, solo.wins, solo.losses)
        };

        assert_eq!(
            solo(party_sizes(&pool, ScoreScope::All).await.unwrap()),
            (1, 2, 1, 1)
        );
        assert_eq!(
            solo(party_sizes(&pool, ScoreScope::Draft).await.unwrap()),
            (1, 1, 0, 1)
        );
    }

    #[tokio::test]
    async fn role_records_count_the_scopes_games_by_role() {
        let pool = pool().await;
        let game = |name: &str, timestamp, mode, hero: &str, win| {
            hero_game(name, timestamp, mode, "cursed_hollow", hero, win)
        };

        for game in [
            game("tank-won", 1000, Mode::QuickMatch, "Muradin", true),
            game("tank-lost", 2000, Mode::StormLeague, "Muradin", false),
            game("healer-won", 3000, Mode::QuickMatch, "Tyrande", true),
            game("healer-aram", 4000, Mode::Aram, "Tyrande", false),
            game("no-role", 5000, Mode::QuickMatch, "Wizard", true),
        ] {
            insert_bundle(&pool, game).await.unwrap();
        }

        sqlx::query(
            "UPDATE heroes SET role = 'tank' WHERE slug = 'Muradin';
             UPDATE heroes SET role = 'healer' WHERE slug = 'Tyrande';",
        )
        .execute(&pool)
        .await
        .unwrap();

        let read = |records: Vec<RoleRecord>| -> Vec<_> {
            records
                .into_iter()
                .map(|record| (record.role, record.games, record.wins, record.losses))
                .collect()
        };

        assert_eq!(
            read(role_records(&pool, ScoreScope::All).await.unwrap()),
            [
                (HeroRole::Tank, 2, 1, 1),
                (HeroRole::Bruiser, 0, 0, 0),
                (HeroRole::Healer, 1, 1, 0),
                (HeroRole::Support, 0, 0, 0),
                (HeroRole::MeleeAssassin, 0, 0, 0),
                (HeroRole::RangedAssassin, 0, 0, 0),
            ]
        );
        assert_eq!(
            read(role_records(&pool, ScoreScope::Draft).await.unwrap()),
            [
                (HeroRole::Tank, 1, 0, 1),
                (HeroRole::Bruiser, 0, 0, 0),
                (HeroRole::Healer, 0, 0, 0),
                (HeroRole::Support, 0, 0, 0),
                (HeroRole::MeleeAssassin, 0, 0, 0),
                (HeroRole::RangedAssassin, 0, 0, 0),
            ]
        );
    }

    #[tokio::test]
    async fn session_bests_reads_the_owner_games() {
        let pool = pool().await;
        let game = |index: i64, hero_damage| {
            let mut game = hero_game(
                &format!("g{index}"),
                (index + 1) * 1000,
                Mode::QuickMatch,
                "cursed_hollow",
                "Wizard",
                false,
            );
            game.replay.duration = 600;
            game.replay_players[0].score = NewScore {
                hero_damage: Some(hero_damage),
                ..Default::default()
            };
            game
        };

        for index in 0..10 {
            insert_bundle(&pool, game(index, 50_000)).await.unwrap();
        }
        let start = DateTime::from_timestamp(11_000, 0).unwrap();
        assert!(session_bests(&pool, start).await.unwrap().is_empty());

        insert_bundle(&pool, game(10, 60_000)).await.unwrap();
        let bests = session_bests(&pool, start).await.unwrap();
        let read: Vec<_> = bests
            .iter()
            .map(|best| {
                (
                    best.metric,
                    best.career,
                    best.hero.as_str(),
                    best.value,
                    best.previous,
                )
            })
            .collect();
        assert_eq!(
            read,
            [(BestMetric::HeroDamage, true, "Wizard", 60_000.0, 50_000.0)]
        );
    }

    #[tokio::test]
    async fn session_record_counts_games_ended_since_the_start() {
        let pool = pool().await;
        let game = |name: &str, timestamp, hero: &str, win| {
            let mut game = hero_game(
                name,
                timestamp,
                Mode::QuickMatch,
                "cursed_hollow",
                hero,
                win,
            );
            game.replay.duration = 600;
            game
        };
        let mut other = game("other", 7000, "Tyrande", true);
        other.replay_players[0].awards = vec![];

        for game in [
            game("earlier", 1000, "Wizard", true),
            // Started before the session and ended in it.
            game("running", 4500, "Wizard", false),
            game("later", 6000, "Wizard", true),
            other,
        ] {
            insert_bundle(&pool, game).await.unwrap();
        }

        let start = DateTime::from_timestamp(5000, 0).unwrap();
        let record = session_record(&pool, start).await.unwrap();
        assert_eq!(record.started, start);
        assert_eq!((record.wins, record.losses), (2, 1));
        assert_eq!((record.career_wins, record.career_losses), (3, 1));
        assert_eq!(record.duration, 3 * 600);

        let heroes: Vec<_> = record
            .heroes
            .iter()
            .map(|hero| {
                (
                    hero.name.as_str(),
                    hero.games,
                    (hero.wins, hero.losses),
                    (hero.career_wins, hero.career_losses),
                )
            })
            .collect();
        assert_eq!(
            heroes,
            [
                ("Wizard", 2, (1, 1), (2, 1)),
                ("Tyrande", 1, (1, 0), (1, 0))
            ]
        );

        let games: Vec<_> = record
            .games
            .iter()
            .map(|game| (game.hero.as_str(), game.win, game.mvp))
            .collect();
        assert_eq!(
            games,
            [
                ("Tyrande", Some(true), false),
                ("Wizard", Some(true), true),
                ("Wizard", Some(false), true),
            ]
        );

        let none = session_record(&pool, DateTime::<Utc>::MAX_UTC)
            .await
            .unwrap();
        assert!(none.heroes.is_empty() && none.games.is_empty());
        assert_eq!((none.career_wins, none.career_losses), (3, 1));
    }

    #[tokio::test]
    async fn scored_players_read_every_player_of_the_scopes_games() {
        let pool = pool().await;
        let game = |name: &str, timestamp, mode, duration| {
            let mut game = hero_game(name, timestamp, mode, "cursed_hollow", "Wizard", true);
            game.replay.duration = duration;
            game
        };

        let mut played = game("played", 2000, Mode::QuickMatch, 900);
        played.players.push(Player {
            toon: "ai-6".to_owned(),
            name: "Enemy".to_owned(),
            account_level: None,
        });
        played.replay_players.push(NewReplayPlayer {
            toon: "ai-6".to_owned(),
            slot: 6,
            team: 1,
            hero_slug: "Wizard".to_owned(),
            time_dead_secs: None,
            time_on_fire_secs: None,
            upvotes: 0,
            party: None,
            xp: None,
            score: NewScore {
                hero_damage: Some(40_000),
                time_rooting: Some(12),
                ..Default::default()
            },
            talents: vec![],
            awards: vec![],
        });

        for game in [
            played,
            game("ranked", 1000, Mode::StormLeague, 900),
            game("aram", 3000, Mode::Aram, 900),
            game("remake", 4000, Mode::QuickMatch, 599),
        ] {
            insert_bundle(&pool, game).await.unwrap();
        }

        let mut tx = pool.begin().await.unwrap();
        let players = scored_players(&mut tx, Scope::of(ScoreScope::All))
            .await
            .unwrap();
        let read: Vec<_> = players
            .iter()
            .map(|p| (p.is_owner, p.is_ai, p.hero_damage, p.hard_cc))
            .collect();
        // A remake is short, but still a game played.
        assert_eq!(
            read,
            [
                (true, false, None, None),
                (true, false, None, None),
                (false, true, Some(40_000), Some(12)),
                (true, false, None, None),
            ]
        );
        assert_ne!(players[0].game_id, players[1].game_id);
        assert_eq!(players[1].game_id, players[2].game_id);
        assert_ne!(players[2].game_id, players[3].game_id);

        let draft = scored_players(&mut tx, Scope::of(ScoreScope::Draft))
            .await
            .unwrap();
        let [ranked] = &draft[..] else {
            panic!("only the ranked game is a draft one");
        };
        assert_eq!(ranked.game_id, players[0].game_id);

        let quick = scored_players(&mut tx, Scope::of(ScoreScope::QuickMatch))
            .await
            .unwrap();
        let quick: Vec<_> = quick.iter().map(|p| p.game_id).collect();
        assert_eq!(
            quick,
            [players[1].game_id, players[1].game_id, players[3].game_id]
        );
    }

    #[tokio::test]
    async fn profile_cards_read_the_same_games() {
        let pool = seeded_pool().await;
        let start = 1_700_000_000;
        let games = (0..12)
            .map(|i| GameBuilder::new(&format!("ranked {i}")))
            .chain((0..3).map(|i| GameBuilder::new(&format!("quick {i}")).mode(Mode::QuickMatch)))
            .chain((0..2).map(|i| GameBuilder::new(&format!("remake {i}")).secs(300)))
            .chain((0..2).map(|i| GameBuilder::new(&format!("aram {i}")).mode(Mode::Aram)));
        for (i, game) in games.enumerate() {
            let game = game.at(start + i as i64 * 3_600).build();
            insert_bundle(&pool, game).await.unwrap();
        }
        let now = DateTime::from_timestamp(start + 7 * 86_400, 0).unwrap();

        for (scope, expected) in [
            (ScoreScope::All, 17),
            (ScoreScope::Draft, 14),
            (ScoreScope::QuickMatch, 3),
        ] {
            let score = profile_score(&pool, scope, now).await.unwrap();
            let form = recent_form(&pool, scope, now).await.unwrap();
            let party: i64 = party_sizes(&pool, scope)
                .await
                .unwrap()
                .iter()
                .map(|size| size.games)
                .sum();
            let roles: i64 = role_records(&pool, scope)
                .await
                .unwrap()
                .iter()
                .map(|role| role.games)
                .sum();

            assert_eq!(
                (
                    score.eligible_games,
                    form.all.recent_games,
                    party as usize,
                    roles as usize,
                ),
                (expected, expected, expected, expected),
                "{scope:?}",
            );
        }
    }

    #[tokio::test]
    async fn scores_a_ranked_career_against_its_peers() {
        let pool = seeded_pool().await;
        // The owner plays a ranged assassin, two peers a game, and a role needs 30
        // samples to rank against.
        for i in 0..15 {
            let game = GameBuilder::new(&format!("ranked {i}")).at(1_700_000_000 + i * 3_600);
            insert_bundle(&pool, game.build()).await.unwrap();
        }
        let now = DateTime::from_timestamp(1_800_000_000, 0).unwrap();

        let score = profile_score(&pool, ScoreScope::Draft, now).await.unwrap();

        // Nine peers a game, every one with a role.
        assert_eq!(score.baseline_players, 15 * 9);
        assert_eq!(score.career_games, 15);
        assert!(score.career.is_some());
        assert_eq!(score.heroes.len(), 1);
        assert!(!score.pillars.is_empty());
    }
}
