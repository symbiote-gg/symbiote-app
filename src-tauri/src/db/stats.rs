use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool};

use crate::db::hero_stats;
use crate::profile_score::{self, PlayerGame};
use crate::types::hero::HeroRole;
use crate::types::replay::Mode;
use crate::types::stats::{
    HeroStat, MapStat, MostPlayedHeroes, PartySize, ProfileBests, ProfileCareer, ProfileScore,
    RecentForm, ScoreScope, ScoredHero, SessionGame, SessionHero, SessionRecord,
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

    let totals = hero_stats::totals(&mut tx, None).await?;
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

/// Returns the owner's bests across every hero, all read from the same snapshot.
pub async fn profile_bests(pool: &SqlitePool) -> sqlx::Result<ProfileBests> {
    let mut tx = pool.begin().await?;
    let bests = hero_stats::profile_bests(&mut tx).await?;
    tx.commit().await?;

    Ok(bests)
}

async fn mvps(conn: &mut SqliteConnection) -> sqlx::Result<i64> {
    sqlx::query_scalar(
        "SELECT COUNT(*)
         FROM replays r
         JOIN games_players_awards a
             ON a.game_id = r.game_id AND a.player_id = r.owner_player_id
         WHERE a.award = 'mvp'",
    )
    .fetch_one(conn)
    .await
}

/// The role the owner played the most games as.
async fn main_role(conn: &mut SqliteConnection) -> sqlx::Result<Option<HeroRole>> {
    sqlx::query_scalar(
        "SELECT h.role
         FROM replays_view r
         JOIN heroes h ON h.id = r.owner_hero_id
         WHERE h.role IS NOT NULL
         GROUP BY h.role
         ORDER BY COUNT(*) DESC
         LIMIT 1",
    )
    .fetch_optional(conn)
    .await
}

/// Every player of the games the profile score reads, a game's players together and
/// the games in the order played. A player is the owner in the games they have a
/// replay of.
async fn scored_players(
    tx: &mut sqlx::SqliteConnection,
    scope: ScoreScope,
) -> sqlx::Result<Vec<PlayerGame>> {
    let mut query = QueryBuilder::<Sqlite>::new(
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
         WHERE g.mode IN (",
    );

    let mut modes = query.separated(", ");
    for &mode in profile_score::modes(scope) {
        modes.push_bind(mode);
    }

    query
        .push(") AND g.duration >= ")
        .push_bind(profile_score::MIN_GAME_SECS)
        .push(" ORDER BY g.timestamp, g.id")
        .build_query_as::<PlayerGame>()
        .fetch_all(tx)
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
    let players = scored_players(&mut tx, scope).await?;
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
    let players = scored_players(&mut conn, scope).await?;

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
    let start = session_start.timestamp();
    let mut tx = pool.begin().await?;

    let (career_wins, career_losses): (i64, i64) = sqlx::query_as(
        "SELECT COALESCE(SUM(owner_win = 1), 0), COALESCE(SUM(owner_win = 0), 0)
         FROM replays_view",
    )
    .fetch_one(&mut *tx)
    .await?;

    let heroes = sqlx::query_as::<_, SessionHero>(
        "SELECT h.id AS hero_id, h.name, h.portrait, h.accent,
             SUM(r.timestamp + r.duration >= ?1) AS games,
             COALESCE(SUM(r.owner_win = 1 AND r.timestamp + r.duration >= ?1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0 AND r.timestamp + r.duration >= ?1), 0) AS losses,
             COALESCE(SUM(r.owner_win = 1), 0) AS career_wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS career_losses
         FROM replays_view r
         JOIN heroes h ON h.id = r.owner_hero_id
         GROUP BY h.id
         HAVING games > 0
         ORDER BY games DESC, h.name",
    )
    .bind(start)
    .fetch_all(&mut *tx)
    .await?;

    let games = sqlx::query_as::<_, SessionGame>(
        "SELECT r.id AS replay_id, r.game_id, r.timestamp, r.duration,
             h.id AS hero_id, h.name AS hero, h.portrait,
             COALESCE(m.name, r.map) AS map,
             r.owner_win AS win,
             EXISTS (
                 SELECT 1 FROM games_players_awards a
                 WHERE a.game_id = r.game_id
                     AND a.player_id = r.owner_player_id
                     AND a.award = 'mvp'
             ) AS mvp
         FROM replays_view r
         JOIN heroes h ON h.id = r.owner_hero_id
         LEFT JOIN maps m ON m.id = r.map
         WHERE r.timestamp + r.duration >= ?
         ORDER BY r.timestamp DESC, r.id DESC",
    )
    .bind(start)
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

/// Returns the `limit` heroes the owner played the most, with how many heroes they
/// played overall.
pub async fn most_played_heroes(pool: &SqlitePool, limit: i64) -> sqlx::Result<MostPlayedHeroes> {
    let mut tx = pool.begin().await?;
    let (played, total): (i64, i64) = sqlx::query_as(
        "SELECT (SELECT COUNT(DISTINCT owner_hero_id) FROM replays_view),
             (SELECT COUNT(*) FROM heroes)",
    )
    .fetch_one(&mut *tx)
    .await?;

    let heroes = sqlx::query_as::<_, HeroStat>(
        "SELECT h.id AS hero_id, h.name, h.role, h.portrait,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses
         FROM replays_view r
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

/// Returns the modes the owner has played.
pub async fn played_modes(pool: &SqlitePool) -> sqlx::Result<Vec<Mode>> {
    sqlx::query_scalar("SELECT DISTINCT mode FROM replays_view")
        .fetch_all(pool)
        .await
}

/// Returns the maps the owner has played on, by name, with how many games on each.
pub async fn played_maps(pool: &SqlitePool) -> sqlx::Result<Vec<MapStat>> {
    sqlx::query_as::<_, MapStat>(
        "SELECT r.map AS id, COALESCE(m.name, r.map) AS name, m.loading_screen,
             COUNT(*) AS games
         FROM replays_view r
         LEFT JOIN maps m ON m.id = r.map
         GROUP BY r.map
         ORDER BY name",
    )
    .fetch_all(pool)
    .await
}

const MAX_PARTY: i64 = 5;

/// Returns the owner's games by party size, from solo to a full stack, sizes they never
/// played at included with no games.
pub async fn party_sizes(pool: &SqlitePool) -> sqlx::Result<Vec<PartySize>> {
    // The parser numbers each game's parties itself, so the owner's party is the team
    // mates sharing their number in that game.
    let played = sqlx::query_as::<_, PartySize>(
        "SELECT CASE WHEN r.owner_party_num IS NULL THEN 1 ELSE (
                 SELECT COUNT(*) FROM games_players gp
                 WHERE gp.game_id = r.game_id AND gp.team = r.owner_team
                     AND gp.party = r.owner_party_num)
             END AS size,
             COUNT(*) AS games,
             COALESCE(SUM(r.owner_win = 1), 0) AS wins,
             COALESCE(SUM(r.owner_win = 0), 0) AS losses
         FROM replays_view r
         GROUP BY size",
    )
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::test_utils::pool;
    use crate::types::player::Player;
    use crate::types::replay::{NewReplayPlayer, NewScore};

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

        let sizes: Vec<_> = party_sizes(&pool)
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
    async fn scored_players_skip_other_modes_and_short_games() {
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
        let players = scored_players(&mut tx, ScoreScope::All).await.unwrap();
        let read: Vec<_> = players
            .iter()
            .map(|p| (p.is_owner, p.is_ai, p.hero_damage, p.hard_cc))
            .collect();
        assert_eq!(
            read,
            [
                (true, false, None, None),
                (true, false, None, None),
                (false, true, Some(40_000), Some(12)),
            ]
        );
        assert_ne!(players[0].game_id, players[1].game_id);
        assert_eq!(players[1].game_id, players[2].game_id);

        let draft = scored_players(&mut tx, ScoreScope::Draft).await.unwrap();
        let [ranked] = &draft[..] else {
            panic!("only the ranked game is a draft one");
        };
        assert_eq!(ranked.game_id, players[0].game_id);

        let quick = scored_players(&mut tx, ScoreScope::QuickMatch)
            .await
            .unwrap();
        let quick: Vec<_> = quick.iter().map(|p| p.game_id).collect();
        assert_eq!(quick, [players[1].game_id; 2]);
    }
}
