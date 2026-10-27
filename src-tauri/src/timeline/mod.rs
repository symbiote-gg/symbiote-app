//! Reads a replay's stored event rows back into its [`Timeline`].
//!
//! Rows hold the parser's own structs as JSON, minus what their columns already store
//! (gameloop, team, a map event's name). They're read back into the slim structs here,
//! which take only the fields the timeline shows.

mod fights;
pub mod flow;
pub mod kill_log;
mod maps;
mod milestones;

use hots_replay_parser::summary::Lane;
use serde::de::DeserializeOwned;
use serde::Deserialize;

use crate::types::timeline::{Camp, Death, RawEvent, Structure, Timeline, XpBreakdown};
use maps::{MapData, MapRow};

const KEEP_UNIT: &str = "TownTownHallL3";

#[derive(Deserialize)]
struct DeathData {
    victim: u8,
    killers: Vec<u8>,
    killing_blow: Option<u8>,
    x: Option<f64>,
    y: Option<f64>,
    allies_nearby: Option<u8>,
    #[serde(default)]
    near_players: Vec<u8>,
}

#[derive(Deserialize)]
struct LevelData {
    level: u32,
}

#[derive(Deserialize)]
struct XpData {
    xp: XpBreakdown,
}

#[derive(Deserialize)]
struct CampData {
    camp_type: Option<String>,
    #[serde(default)]
    home_team: Option<u8>,
}

#[derive(Deserialize)]
struct StructureData {
    unit_type: Option<String>,
    lane: Option<Lane>,
    killers: Vec<u8>,
    killing_blow: Option<u8>,
}

/// Builds the timeline of a game lasting `duration` seconds from its event rows.
pub fn build(rows: Vec<RawEvent>, duration: f64) -> Timeline {
    let mut timeline = Timeline {
        levels: [vec![(0.0, 1)], vec![(0.0, 1)]],
        ..Timeline::default()
    };
    let mut map_rows = Vec::new();

    for RawEvent {
        kind,
        time,
        team,
        data,
    } in rows
    {
        let team = team.and_then(|team| u8::try_from(team).ok());

        match kind.as_str() {
            // Map events keep theirs: their maps look across all of a kind's events.
            "death" | "team_level" | "xp" | "camp_capture" | "structure_death" if time < 0.0 => {}
            "death" => {
                let Some(death) = parse::<DeathData>(&kind, data.0) else {
                    continue;
                };
                timeline.deaths.push(Death {
                    time,
                    team,
                    victim: death.victim,
                    killers: death.killers,
                    killing_blow: death.killing_blow,
                    x: death.x,
                    y: death.y,
                    allies_nearby: death.allies_nearby,
                    near_players: death.near_players,
                });
            }
            "team_level" => {
                let Some(level) = parse::<LevelData>(&kind, data.0) else {
                    continue;
                };
                // Level 1 at 0 is already there.
                if time > 0.0 {
                    if let Some(curve) =
                        team.and_then(|team| timeline.levels.get_mut(usize::from(team)))
                    {
                        curve.push((time, level.level));
                    }
                }
            }
            "xp" => {
                let Some(XpData { xp }) = parse::<XpData>(&kind, data.0) else {
                    continue;
                };
                if let Some(curve) = team.and_then(|team| timeline.xp.get_mut(usize::from(team))) {
                    let total = xp.minion + xp.creep + xp.structure + xp.hero + xp.trickle;
                    curve.push((time, total));
                }
            }
            "camp_capture" => {
                let Some(camp) = parse::<CampData>(&kind, data.0) else {
                    continue;
                };

                timeline.camps.push(Camp {
                    time,
                    team,
                    camp_type: camp.camp_type,
                    stolen: camp
                        .home_team
                        .zip(team)
                        .is_some_and(|(home, team)| home != team),
                });
            }
            "structure_death" => {
                let Some(structure) = parse::<StructureData>(&kind, data.0) else {
                    continue;
                };
                timeline.structures.push(Structure {
                    time,
                    team,
                    keep: structure.unit_type.as_deref() == Some(KEEP_UNIT),
                    lane: structure.lane,
                    killers: structure.killers,
                    killing_blow: structure.killing_blow,
                });
            }
            _ => {
                let Some(event) = parse::<MapData>(&kind, data.0) else {
                    continue;
                };
                map_rows.push(MapRow {
                    kind,
                    time,
                    team,
                    event,
                });
            }
        }
    }

    timeline.objectives = maps::objectives(&map_rows, &timeline.deaths, &timeline.structures);
    timeline.fights = fights::group(&timeline.deaths, duration);
    timeline.milestones = milestones::reached(&timeline);
    timeline
}

/// Skips a row that doesn't read back, so it can't take the whole timeline down.
fn parse<T: DeserializeOwned>(kind: &str, data: serde_json::Value) -> Option<T> {
    serde_json::from_value(data)
        .inspect_err(|err| log::warn!("skipping unreadable {kind} event: {err}"))
        .ok()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::types::timeline::MilestoneKind;

    /// Builds a 10 minute game's timeline.
    pub(super) fn build(rows: Vec<RawEvent>) -> Timeline {
        super::build(rows, 600.0)
    }

    fn row(kind: &str, time: f64, team: Option<i64>, data: serde_json::Value) -> RawEvent {
        RawEvent {
            kind: kind.to_owned(),
            time,
            team,
            data: sqlx::types::Json(data),
        }
    }

    pub(super) fn map_row(
        kind: &str,
        time: f64,
        team: Option<i64>,
        ints: serde_json::Value,
        fixed: serde_json::Value,
        strings: serde_json::Value,
    ) -> RawEvent {
        row(
            kind,
            time,
            team,
            json!({ "ints": ints, "strings": strings, "fixed": fixed }),
        )
    }

    pub(super) fn death(time: f64, victim: u8, killers: &[u8]) -> RawEvent {
        row(
            "death",
            time,
            Some(0),
            json!({
                "victim": victim,
                "killers": killers,
                "killing_blow": killers.first(),
                "x": 0.0,
                "y": 0.0,
                "allies_nearby": 1,
            }),
        )
    }

    #[test]
    fn reads_xp_totals() {
        let xp = |time, team| {
            row(
                "xp",
                time,
                Some(team),
                json!({
                    "xp": { "minion": 100.0, "creep": 20.0, "structure": 3.0, "hero": 0.5, "trickle": 4.0 },
                    "team_level": 2,
                }),
            )
        };
        let timeline = build(vec![xp(-1.0, 0), xp(60.0, 0), xp(60.0, 1)]);
        assert_eq!(timeline.xp, [vec![(60.0, 127.5)], vec![(60.0, 127.5)]]);
    }

    #[test]
    fn reads_deaths_structures_and_levels() {
        let timeline = build(vec![
            death(5.0, 1, &[6, 7]),
            row(
                "structure_death",
                8.0,
                Some(1),
                json!({
                    "unit_type": KEEP_UNIT,
                    "town_id": 3,
                    "lane": "top",
                    "killers": [2],
                    "killing_blow": null,
                }),
            ),
            row("team_level", 0.0, Some(1), json!({ "level": 1 })),
            row("team_level", 60.0, Some(1), json!({ "level": 2 })),
            row("death", 9.0, Some(0), json!({ "victim": 1 })),
            // An ingest from before positions were tracked.
            row(
                "death",
                100.0,
                Some(0),
                json!({ "victim": 2, "killers": [6] }),
            ),
        ]);

        assert_eq!(timeline.deaths.len(), 2);
        assert_eq!(timeline.deaths[0].killing_blow, Some(6));
        assert_eq!(timeline.deaths[0].x, Some(0.0));
        assert_eq!(timeline.deaths[0].y, Some(0.0));
        assert_eq!(timeline.deaths[0].allies_nearby, Some(1));
        assert_eq!(timeline.deaths[1].x, None);
        assert_eq!(timeline.deaths[1].allies_nearby, None);
        assert!(timeline.structures[0].keep);
        assert_eq!(timeline.levels[0], [(0.0, 1)]);
        assert_eq!(timeline.levels[1], [(0.0, 1), (60.0, 2)]);
    }

    #[test]
    fn reads_milestones() {
        let fort = |time, team, unit| {
            row(
                "structure_death",
                time,
                Some(team),
                json!({ "unit_type": unit, "lane": null, "killers": [], "killing_blow": null }),
            )
        };
        let level =
            |time, team, level| row("team_level", time, Some(team), json!({ "level": level }));
        let timeline = build(vec![
            death(30.0, 1, &[6]),
            fort(200.0, 1, KEEP_UNIT),
            fort(300.0, 0, "TownTownHallL2"),
            level(400.0, 1, 10),
            level(410.0, 0, 10),
        ]);

        let reached: Vec<_> = timeline
            .milestones
            .iter()
            .map(|m| (m.kind, m.team, m.time))
            .collect();
        assert_eq!(
            reached,
            [
                (MilestoneKind::Blood, 1, 30.0),
                (MilestoneKind::Fort, 1, 300.0),
                (MilestoneKind::Ten, 1, 400.0),
            ]
        );
    }
}
