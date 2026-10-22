//! Reads a replay's stored event rows back into its [`Timeline`].
//!
//! Rows hold the parser's own structs as JSON, so they deserialize back into them.

mod maps;

use std::collections::HashMap;

use hots_replay_parser::summary::{self, CampCapture, MapEvent, StructureDeath, TeamLevel};
use serde::de::DeserializeOwned;

use crate::types::timeline::{Camp, Death, RawEvent, Structure, Timeline};
use maps::MapRow;

const KEEP_UNIT: &str = "TownTownHallL3";

pub fn build(rows: Vec<RawEvent>) -> Timeline {
    let mut timeline = Timeline {
        levels: [vec![(0.0, 1)], vec![(0.0, 1)]],
        ..Timeline::default()
    };
    let mut map_rows = Vec::new();
    let mut captures = HashMap::<i64, u32>::new();

    for RawEvent {
        kind,
        time,
        team,
        data,
    } in rows
    {
        let team = team.and_then(|team| u8::try_from(team).ok());

        match kind.as_str() {
            "xp" => {}
            // Map events keep theirs: their maps look across all of a kind's events.
            "death" | "team_level" | "camp_capture" | "structure_death" if time < 0.0 => {}
            "death" => {
                let Some(death) = parse::<summary::Death>(&kind, data.0) else {
                    continue;
                };
                timeline.deaths.push(Death {
                    time,
                    team,
                    victim: death.victim,
                    killers: death.killers,
                    killing_blow: death.killing_blow,
                    alone: death.alone,
                });
            }
            "team_level" => {
                let Some(level) = parse::<TeamLevel>(&kind, data.0) else {
                    continue;
                };
                // Level 1 at 0 is already there.
                if time > 0.0 {
                    if let Some(curve) = timeline.levels.get_mut(usize::from(level.team)) {
                        curve.push((time, level.level));
                    }
                }
            }
            "camp_capture" => {
                let Some(camp) = parse::<CampCapture>(&kind, data.0) else {
                    continue;
                };
                let nth = captures.entry(camp.camp_id).or_default();
                *nth += 1;
                timeline.camps.push(Camp {
                    time,
                    team,
                    camp_type: camp.camp_type,
                    nth: *nth,
                });
            }
            "structure_death" => {
                let Some(structure) = parse::<StructureDeath>(&kind, data.0) else {
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
                let Some(event) = parse::<MapEvent>(&kind, data.0) else {
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
            json!({
                "name": kind,
                "gameloop": 0,
                "team": team,
                "ints": ints,
                "strings": strings,
                "fixed": fixed,
            }),
        )
    }

    pub(super) fn death(time: f64, victim: u8, killers: &[u8]) -> RawEvent {
        row(
            "death",
            time,
            Some(0),
            json!({
                "gameloop": 0,
                "victim": victim,
                "killers": killers,
                "killing_blow": killers.first(),
                "x": 0.0,
                "y": 0.0,
            }),
        )
    }

    #[test]
    fn counts_captures_per_camp() {
        let camp = |time, id| {
            row(
                "camp_capture",
                time,
                Some(0),
                json!({ "gameloop": 0, "team": 0, "camp_id": id, "camp_type": "Siege Camp" }),
            )
        };
        let timeline = build(vec![
            camp(-1.0, 1),
            camp(10.0, 1),
            camp(20.0, 2),
            camp(30.0, 1),
        ]);
        let nths: Vec<_> = timeline.camps.iter().map(|camp| camp.nth).collect();
        assert_eq!(nths, [1, 1, 2]);
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
                    "gameloop": 0,
                    "team": 1,
                    "unit_type": KEEP_UNIT,
                    "town_id": 3,
                    "lane": "top",
                    "killers": [2],
                    "killing_blow": null,
                }),
            ),
            row(
                "team_level",
                0.0,
                Some(1),
                json!({ "gameloop": 0, "team": 1, "level": 1 }),
            ),
            row(
                "team_level",
                60.0,
                Some(1),
                json!({ "gameloop": 0, "team": 1, "level": 2 }),
            ),
            row("death", 9.0, Some(0), json!({ "victim": 1 })),
        ]);

        assert_eq!(timeline.deaths.len(), 1);
        assert_eq!(timeline.deaths[0].killing_blow, Some(6));
        assert_eq!(timeline.deaths[0].alone, None);
        assert!(timeline.structures[0].keep);
        assert_eq!(timeline.levels[0], [(0.0, 1)]);
        assert_eq!(timeline.levels[1], [(0.0, 1), (60.0, 2)]);
    }
}
