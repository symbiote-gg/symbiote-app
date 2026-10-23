//! What each map's objective events mean: who gained, and the race, hold, summon,
//! duel, altar or knight behind them. Keys are the parser's raw stat names.

use std::ptr;

use indexmap::IndexMap;
use serde::Deserialize;

use crate::types::timeline::{
    Altar, Death, Duel, Knight, Objective, Race, RaceKind, RaceUnit, RawData, Structure, Summon,
};

/// A map event's raw stat values, keyed as the parser emits them, in its order.
#[derive(Debug, Deserialize)]
pub(super) struct MapData {
    #[serde(default)]
    pub ints: IndexMap<String, i64>,
    #[serde(default)]
    pub strings: IndexMap<String, String>,
    #[serde(default)]
    pub fixed: IndexMap<String, f64>,
}

pub(super) struct MapRow {
    pub kind: String,
    pub time: f64,
    pub team: Option<u8>,
    pub event: MapData,
}

impl MapRow {
    fn int(&self, key: &str) -> Option<i64> {
        self.event.ints.get(key).copied()
    }

    fn fixed(&self, key: &str) -> Option<f64> {
        self.event.fixed.get(key).copied()
    }

    /// Map-event ints count teams from 1.
    fn int_team(&self, key: &str) -> Option<u8> {
        match self.int(key) {
            Some(1) => Some(0),
            Some(2) => Some(1),
            _ => None,
        }
    }

    /// A winner-first pair of ints.
    fn pair(&self, won: &str, lost: &str) -> Option<[f64; 2]> {
        Some([self.int(won)? as f64, self.int(lost)? as f64])
    }
}

/// Events no timeline shows, only read by the ones it does.
const IGNORED: &[&str] = &[
    "boss_duel_started",
    "golem_lanes",
    "six_town_event_end",
    "sky_temple_activated",
    "sky_temple_shots_fired",
    "town_captured",
    "volskaya_capture_point_spawned",
    "warhead_junction_nuke_collected",
    "warhead_junction_nuke_dropped",
    "warhead_junction_nukes_spawned",
];

/// Objectives from the game's map events, from the gates opening on.
pub(super) fn objectives(
    rows: &[MapRow],
    deaths: &[Death],
    structures: &[Structure],
) -> Vec<Objective> {
    rows.iter()
        .filter(|row| row.time >= 0.0 && !IGNORED.contains(&row.kind.as_str()))
        .filter_map(|row| objective(row, rows, deaths, structures))
        .collect()
}

fn objective(
    row: &MapRow,
    rows: &[MapRow],
    deaths: &[Death],
    structures: &[Structure],
) -> Option<Objective> {
    let mut objective = Objective {
        time: row.time,
        kind: row.kind.clone(),
        team: row.team,
        variant: None,
        race: None,
        held: None,
        summon: None,
        duel: None,
        altar: None,
        knight: None,
        raw: None,
    };
    // A map's own team key wins over the event's team, when set.
    let gained = |key: &str| row.int_team(key).or(row.team);

    match row.kind.as_str() {
        "alterac_cavalry_charge" | "garden_terror_spawned" | "hanamura_payload_delivered" => {
            objective.team = gained("Team");
        }
        "immortal_defeated" => {
            objective.team = gained("Winning Team");
            objective.duel = row.int_team("Winning Team").map(|winner| Duel {
                range: before(row, row.int("Immortal Fight Duration").unwrap_or(0)),
                winner,
                power: row.fixed("Immortal Power Percent").unwrap_or(0.0).round() as i64,
            });
        }
        "ghost_ship_captured" => objective.race = score_race(row, RaceKind::Ship),
        "braxis_holdout_map_event_complete" => {
            let order = row.fixed("TeamOrderProgress").unwrap_or(0.0);
            let chaos = row.fixed("TeamChaosProgress").unwrap_or(0.0);
            let leader = if order == chaos {
                None
            } else if order > chaos {
                Some(0)
            } else {
                Some(1)
            };
            objective.team = leader.or(row.team);
            objective.race = Some(Race {
                unit: Some(RaceUnit::Percent),
                ..race(RaceKind::Wave, [order.round(), chaos.round()])
            });
        }
        "raven_curse_activated" => objective.race = score_race(row, RaceKind::Curse),
        "tribute_collected" => {}
        "dragon_knight_activated" => objective.knight = knight(row, deaths, structures),
        "haunted_mines_golems_spawned" => {
            // Both teams' golems rise together, one event each: keep the stronger's.
            let skulls = |row: &MapRow| row.fixed("SkullCount").unwrap_or(0.0);
            let spawn = rows
                .iter()
                .filter(|other| other.kind == row.kind && other.time == row.time);
            let strongest = spawn.clone().reduce(|best, other| {
                if skulls(other) > skulls(best) {
                    other
                } else {
                    best
                }
            });
            if !strongest.is_some_and(|strongest| ptr::eq(strongest, row)) {
                return None;
            }
            let mut team_values = [0.0; 2];
            for other in spawn {
                if let Some(team) = other.team.filter(|&team| team < 2) {
                    team_values[usize::from(team)] = skulls(other);
                }
            }
            objective.race = Some(race(RaceKind::Golem, team_values));
        }
        "infernal_shrine_captured" => {
            objective.team = gained("Winning Team");
            objective.race = row.int_team("Winning Team").and_then(|winner| {
                let score = row.pair("Winning Score", "Losing Score")?;
                Some(race(RaceKind::Shrine, by_team(winner, score)))
            });
        }
        "punisher_killed" => {
            objective.team = gained("Owning Team of Punisher");
            objective.variant = match row.event.strings.get("Punisher Type").map(String::as_str) {
                Some("FrozenShrine") => Some("frozen"),
                Some("ArcaneShrine") => Some("arcane"),
                Some("BombardShrine") => Some("bombard"),
                _ => None,
            };
            objective.summon =
                row.int("Duration")
                    .filter(|&duration| duration != 0)
                    .map(|duration| Summon {
                        range: before(row, duration),
                        siege: row.fixed("Siege Damage Done").unwrap_or(0.0).round() as i64,
                        heroes: row.fixed("Hero Damage Done").unwrap_or(0.0).round() as i64,
                    });
        }
        "sky_temple_captured" => {
            // Temples flip on every recapture: keep a team's first per activation.
            let team = row.team?;
            let phase = row.int("Event");
            let first = rows.iter().find(|other| {
                other.kind == row.kind && other.team == row.team && other.int("Event") == phase
            });
            if !first.is_some_and(|first| ptr::eq(first, row)) {
                return None;
            }
            let mut team_values = [0.0; 2];
            for shot in rows.iter().filter(|other| {
                other.kind == "sky_temple_shots_fired" && other.int("Event") == phase
            }) {
                if let Some(shooter) = shot.team.filter(|&team| team < 2) {
                    team_values[usize::from(shooter)] +=
                        shot.fixed("SkyTempleShotsDamage").unwrap_or(0.0);
                }
            }
            objective.race = Some(Race {
                top_team: Some(team),
                ..race(RaceKind::Temple, team_values.map(f64::round))
            });
        }
        "soul_eaters_spawned" => objective.race = score_race(row, RaceKind::Gems),
        "altar_captured" => {
            objective.team = gained("Firing Team");
            objective.altar = row.int_team("Firing Team").map(|winner| Altar {
                winner,
                towns: row.int("Towns Owned").unwrap_or(0),
            });
        }
        "six_town_event_start" => {
            objective.team = gained("Owning Team");
            let owner = row.int_team("Owning Team");
            objective.held = rows
                .iter()
                .find(|other| {
                    other.kind == "six_town_event_end"
                        && other.time > row.time
                        && other.int_team("Owning Team") == owner
                })
                .map(|end| (row.time, end.time));
        }
        "volskaya_capture_point_complete" => {
            objective.team = gained("WinningTeam");
            let loser = row.fixed("LosingTeamProgress").unwrap_or(0.0).round();
            objective.race = row.int_team("WinningTeam").map(|winner| Race {
                unit: Some(RaceUnit::Percent),
                ..race(RaceKind::Capture, by_team(winner, [100.0, loser]))
            });
        }
        "warhead_junction_nuke_fired" => objective.team = gained("OwningTeam"),
        _ => {
            // Unknown to every map: any int naming a team stands in for a missing one.
            objective.team = row.team.or_else(|| {
                let key = row
                    .event
                    .ints
                    .keys()
                    .find(|key| key.to_lowercase().contains("team"))?;
                row.int_team(key)
            });
            objective.raw = Some(RawData {
                ints: row
                    .event
                    .ints
                    .iter()
                    .map(|(key, &value)| (key.clone(), value))
                    .collect(),
                strings: row.event.strings.clone().into_iter().collect(),
            });
        }
    }

    Some(objective)
}

fn race(kind: RaceKind, team_values: [f64; 2]) -> Race {
    Race {
        kind,
        team_values,
        unit: None,
        top_team: None,
    }
}

/// Reorders a winner-first pair by team.
fn by_team(winner: u8, [won, lost]: [f64; 2]) -> [f64; 2] {
    if winner == 0 {
        [won, lost]
    } else {
        [lost, won]
    }
}

/// The event's team's score against the other's.
fn score_race(row: &MapRow, kind: RaceKind) -> Option<Race> {
    let team = row.team?;
    let score = row.pair("TeamScore", "OpponentScore")?;
    Some(Race {
        top_team: Some(team),
        ..race(kind, by_team(team, score))
    })
}

/// The `duration` seconds up to the event, from the gates opening at the earliest.
fn before(row: &MapRow, duration: i64) -> (f64, f64) {
    ((row.time - duration as f64).max(0.0), row.time)
}

fn knight(row: &MapRow, deaths: &[Death], structures: &[Structure]) -> Option<Knight> {
    let pilot = u8::try_from(row.int("Pilot")?).ok()?;
    let end = row
        .int("Duration")
        .map(|duration| row.time + duration as f64);
    let during = |time: f64| time >= row.time && end.is_none_or(|end| time <= end);

    Some(Knight {
        range: (row.time, end),
        pilot,
        takedowns: deaths
            .iter()
            .filter(|death| during(death.time) && death.killers.contains(&pilot))
            .count(),
        structures: structures
            .iter()
            .filter(|structure| during(structure.time) && structure.killers.contains(&pilot))
            .count(),
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::super::build;
    use super::super::tests::{death, map_row};

    #[test]
    fn keeps_a_teams_first_temple_capture_per_activation() {
        let capture = |time, team, phase| {
            map_row(
                "sky_temple_captured",
                time,
                Some(team),
                json!({ "Event": phase }),
                json!({}),
                json!({}),
            )
        };
        let shots = |team, phase, damage| {
            map_row(
                "sky_temple_shots_fired",
                50.0,
                Some(team),
                json!({ "Event": phase }),
                json!({ "SkyTempleShotsDamage": damage }),
                json!({}),
            )
        };
        let timeline = build(vec![
            capture(10.0, 0, 1),
            capture(20.0, 1, 1),
            capture(30.0, 0, 1),
            capture(40.0, 0, 2),
            shots(0, 1, 10.4),
            shots(1, 1, 5.0),
            shots(0, 2, 99.0),
        ]);

        let times: Vec<_> = timeline.objectives.iter().map(|o| o.time).collect();
        assert_eq!(times, [10.0, 20.0, 40.0]);
        let race = timeline.objectives[0].race.as_ref().unwrap();
        assert_eq!(race.team_values, [10.0, 5.0]);
        assert_eq!(race.top_team, Some(0));
    }

    #[test]
    fn keeps_the_stronger_golem() {
        let golem = |team, skulls| {
            map_row(
                "haunted_mines_golems_spawned",
                100.0,
                Some(team),
                json!({}),
                json!({ "SkullCount": skulls }),
                json!({}),
            )
        };
        let timeline = build(vec![golem(0, 40.0), golem(1, 60.0)]);

        assert_eq!(timeline.objectives.len(), 1);
        assert_eq!(timeline.objectives[0].team, Some(1));
        assert_eq!(
            timeline.objectives[0].race.as_ref().unwrap().team_values,
            [40.0, 60.0]
        );
    }

    #[test]
    fn holds_all_altars_until_that_teams_end() {
        let event = |kind, time, owner| {
            map_row(
                kind,
                time,
                None,
                json!({ "Owning Team": owner }),
                json!({}),
                json!({}),
            )
        };
        let timeline = build(vec![
            event("six_town_event_start", 100.0, 2),
            event("six_town_event_end", 120.0, 1),
            event("six_town_event_end", 150.0, 2),
        ]);

        assert_eq!(timeline.objectives.len(), 1);
        assert_eq!(timeline.objectives[0].team, Some(1));
        assert_eq!(timeline.objectives[0].held, Some((100.0, 150.0)));
    }

    #[test]
    fn credits_the_knight_pilot_while_it_lives() {
        let timeline = build(vec![
            map_row(
                "dragon_knight_activated",
                100.0,
                Some(0),
                json!({ "Pilot": 3, "Duration": 60 }),
                json!({}),
                json!({}),
            ),
            death(90.0, 6, &[3]),
            death(120.0, 7, &[3, 4]),
            death(130.0, 8, &[4]),
            death(170.0, 9, &[3]),
        ]);

        let knight = timeline.objectives[0].knight.as_ref().unwrap();
        assert_eq!(knight.range, (100.0, Some(160.0)));
        assert_eq!(knight.takedowns, 1);
        assert_eq!(knight.structures, 0);
    }

    #[test]
    fn names_the_punisher_type() {
        let timeline = build(vec![map_row(
            "punisher_killed",
            300.0,
            None,
            json!({ "Owning Team of Punisher": 1, "Duration": 400 }),
            json!({ "Siege Damage Done": 1200.6 }),
            json!({ "Punisher Type": "ArcaneShrine" }),
        )]);

        let punisher = &timeline.objectives[0];
        assert_eq!(punisher.variant, Some("arcane"));
        assert_eq!(punisher.team, Some(0));
        let summon = punisher.summon.as_ref().unwrap();
        assert_eq!(summon.range, (0.0, 300.0));
        assert_eq!(summon.siege, 1201);
    }

    #[test]
    fn reads_a_team_off_an_unknown_event() {
        let timeline = build(vec![
            map_row(
                "brand_new_event",
                10.0,
                None,
                json!({ "Count": 3, "WinnerTeam": 2 }),
                json!({}),
                json!({ "Name": "x" }),
            ),
            map_row(
                "town_captured",
                20.0,
                Some(0),
                json!({}),
                json!({}),
                json!({}),
            ),
            map_row(
                "tribute_collected",
                -5.0,
                Some(0),
                json!({}),
                json!({}),
                json!({}),
            ),
        ]);

        assert_eq!(timeline.objectives.len(), 1);
        let unknown = &timeline.objectives[0];
        assert_eq!(unknown.team, Some(1));
        let raw = unknown.raw.as_ref().unwrap();
        assert_eq!(raw.ints["Count"], 3);
        assert_eq!(raw.strings["Name"], "x");
    }
}
