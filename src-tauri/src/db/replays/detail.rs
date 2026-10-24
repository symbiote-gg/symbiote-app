use hots_replay_parser::summary::LOOPS_PER_SECOND;
use sqlx::{FromRow, SqlitePool};

use crate::types::replay::{AwardInfo, ReplayDetail, ReplayPlayerDetail, TalentPick, XpSample};
use crate::types::timeline::RawEvent;

#[derive(FromRow)]
struct PlayerTalentRow {
    player_id: i64,
    #[sqlx(flatten)]
    talent: TalentPick,
}

#[derive(FromRow)]
struct PlayerAwardRow {
    player_id: i64,
    #[sqlx(flatten)]
    award: AwardInfo,
}

/// Returns the full detail of a replay, or `None` if it doesn't exist.
///
/// Event and XP times are in seconds relative to the gates opening. Everything is read
/// from the same snapshot, so a replay replaced meanwhile can't come back half-read.
///
/// A replay played before `events_cutoff` comes back flagged as expired, without its
/// timeline and XP, even if the purge hasn't deleted its events yet.
pub async fn get_detail(
    pool: &SqlitePool,
    id: i64,
    events_cutoff: i64,
) -> sqlx::Result<Option<ReplayDetail>> {
    let mut tx = pool.begin().await?;
    let Some(mut detail) = sqlx::query_as::<_, ReplayDetail>(
        "SELECT r.id, r.hash, r.path, r.ingest_date, r.timestamp, r.mode, r.map, r.owner_hero_id,
             COALESCE(m.name, r.map) AS map_name, m.loading_screen AS map_loading_screen,
             r.owner_player_id, r.owner_win,
             r.duration, r.is_new, h.name AS hero_name, h.role AS hero_role,
             h.portrait AS hero_portrait
         FROM replays r
         JOIN heroes h ON h.id = r.owner_hero_id
         LEFT JOIN maps m ON m.id = r.map
         WHERE r.id = ?",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    else {
        return Ok(None);
    };

    detail.players = sqlx::query_as::<_, ReplayPlayerDetail>(
        "SELECT rp.player_id, p.name, rp.slot, rp.team, rp.hero_id, h.name AS hero_name,
             h.portrait AS hero_portrait,
             json_extract(rp.score, '$.SoloKill') AS kills,
             json_extract(rp.score, '$.Assists') AS assists,
             json_extract(rp.score, '$.Deaths') AS deaths,
             json_extract(rp.score, '$.HeroDamage') AS hero_damage,
             json_extract(rp.score, '$.SiegeDamage') AS siege_damage,
             json_extract(rp.score, '$.Healing') AS healing,
             json_extract(rp.score, '$.SelfHealing') AS self_healing,
             json_extract(rp.score, '$.DamageTaken') AS damage_taken,
             json_extract(rp.score, '$.ExperienceContribution') AS xp,
             rp.time_dead_secs AS time_dead,
             rp.time_on_fire_secs AS time_on_fire, rp.upvotes, rp.party
         FROM replays_players rp
         JOIN players p ON p.id = rp.player_id
         JOIN heroes h ON h.id = rp.hero_id
         WHERE rp.replay_id = ?
         ORDER BY rp.slot",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    let talents = sqlx::query_as::<_, PlayerTalentRow>(
        "SELECT rpt.player_id, rpt.tier, rpt.talent_id, t.slug, rpt.gameloop, t.name,
             t.description, t.icon
         FROM replays_players_talents rpt
         JOIN talents t ON t.id = rpt.talent_id
         WHERE rpt.replay_id = ?
         ORDER BY rpt.tier",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    let awards = sqlx::query_as::<_, PlayerAwardRow>(
        "SELECT rpa.player_id, rpa.award, a.name, a.description, a.icon
         FROM replays_players_awards rpa
         LEFT JOIN awards a ON a.id = rpa.award
         WHERE rpa.replay_id = ?
         ORDER BY rpa.award = 'mvp' DESC, rpa.award",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;

    detail.events_expired = detail.replay.timestamp.timestamp() < events_cutoff;
    if !detail.events_expired {
        let events = sqlx::query_as::<_, RawEvent>(
            "SELECT k.name AS kind, CAST(e.gameloop - r.gates_open_loop AS REAL) / ? AS time,
                 e.team, json(e.data) AS data
             FROM events e
             JOIN replays r ON r.id = e.replay_id
             JOIN event_kinds k ON k.id = e.kind_id
             WHERE e.replay_id = ? AND k.name != 'xp'
             ORDER BY e.gameloop, e.id",
        )
        .bind(LOOPS_PER_SECOND)
        .bind(id)
        .fetch_all(&mut *tx)
        .await?;

        detail.xp = sqlx::query_as::<_, XpSample>(
            "SELECT CAST(e.gameloop - r.gates_open_loop AS REAL) / ? AS time,
                 CAST(e.team AS INTEGER) AS team,
                 CAST(json_extract(e.data, '$.team_level') AS INTEGER) AS level,
                 CAST(json_extract(e.data, '$.xp.minion') + json_extract(e.data, '$.xp.creep')
                     + json_extract(e.data, '$.xp.structure') + json_extract(e.data, '$.xp.hero')
                     + json_extract(e.data, '$.xp.trickle') AS REAL) AS total
             FROM events e
             JOIN replays r ON r.id = e.replay_id
             JOIN event_kinds k ON k.id = e.kind_id
             WHERE e.replay_id = ? AND k.name = 'xp'
             ORDER BY e.gameloop, e.team",
        )
        .bind(LOOPS_PER_SECOND)
        .bind(id)
        .fetch_all(&mut *tx)
        .await?;
        detail.timeline = crate::timeline::build(events);
    }
    tx.commit().await?;

    for row in talents {
        if let Some(player) = detail
            .players
            .iter_mut()
            .find(|p| p.player_id == row.player_id)
        {
            player.talents.push(row.talent);
        }
    }
    for row in awards {
        if let Some(player) = detail
            .players
            .iter_mut()
            .find(|p| p.player_id == row.player_id)
        {
            player.awards.push(row.award);
        }
    }

    Ok(Some(detail))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::replays::test_utils::*;
    use crate::db::replays::{get_list_row, InsertOutcome};
    use crate::db::test_utils::pool;

    #[tokio::test]
    async fn detail_joins_the_map_and_player_stats() {
        let pool = pool().await;
        sqlx::query("INSERT INTO maps (id, name, loading_screen) VALUES ('cursed_hollow', 'Cursed Hollow', 'ch.webp')")
            .execute(&pool)
            .await
            .unwrap();
        let mut known = bundle("a", 1000);
        known.replay_players[0].score = serde_json::json!({ "SoloKill": 7, "HeroDamage": 70100, "DamageTaken": 52300, "SelfHealing": 8400 });
        known.replay_players[0].upvotes = 3;
        known.replay_players[0].party = Some(2);
        let InsertOutcome::Inserted(known) = insert_bundle(&pool, known).await.unwrap() else {
            panic!("the replay should be inserted");
        };
        let mut unknown = bundle("b", 1000);
        unknown.replay.game_id = hex("other");
        unknown.replay.map = "New Map".to_owned();
        let InsertOutcome::Inserted(unknown) = insert_bundle(&pool, unknown).await.unwrap() else {
            panic!("the replay should be inserted");
        };

        let detail = get_detail(&pool, known, 0).await.unwrap().unwrap();
        assert_eq!(detail.replay.map_name, "Cursed Hollow");
        assert_eq!(detail.replay.map_loading_screen.as_deref(), Some("ch.webp"));
        assert_eq!(detail.players[0].kills, Some(7));
        assert_eq!(detail.players[0].hero_damage, Some(70100));
        assert_eq!(detail.players[0].healing, None);
        assert_eq!(detail.players[0].damage_taken, Some(52300));
        assert_eq!(detail.players[0].self_healing, Some(8400));
        assert_eq!(detail.players[0].upvotes, 3);
        assert_eq!(detail.players[0].party, Some(2));

        let row = get_list_row(&pool, unknown).await.unwrap().unwrap();
        assert_eq!(row.replay.map_name, "New Map");
        assert_eq!(row.replay.map_loading_screen, None);
        assert_eq!(row.players[0].hero_name, "Li-Ming");
        assert_eq!(row.players[0].hero_portrait, None);
    }

    #[tokio::test]
    async fn detail_flags_expired_replays() {
        let pool = pool().await;
        let InsertOutcome::Inserted(id) = insert_bundle(&pool, game_with_events("old", 100))
            .await
            .unwrap()
        else {
            panic!("the replay should be inserted");
        };

        let kept = get_detail(&pool, id, 0).await.unwrap().unwrap();
        assert!(!kept.events_expired);
        assert_eq!(kept.timeline.deaths.len(), 1);

        let expired = get_detail(&pool, id, 200).await.unwrap().unwrap();
        assert!(expired.events_expired);
        assert!(expired.timeline.deaths.is_empty());
        assert!(expired.xp.is_empty());
    }
}
