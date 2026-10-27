//! Groups a game's deaths into fights.

use crate::types::timeline::{Death, Fight, FightKind};

/// Games longer than this get a wider window, as respawns take longer.
const LONG_GAME: f64 = 35.0 * 60.0;
const TEAM_FIGHT_DEATHS: usize = 3;
/// Heroes a side must have involved for a two-death fight to be a team fight.
const TEAM_FIGHT_SIDE: u8 = 4;
/// Heroes per team; a side this involved means the whole team fought.
const TEAM_SIZE: u8 = 5;
const GANK_KILLERS: usize = 3;
/// How far from a fight's last death, in map units, its next one can be: wide enough
/// for a chase within the window, narrower than the gap between lanes.
const FIGHT_RADIUS: f64 = 40.0;

/// Groups `deaths`, in time order, so each one is within the window and radius of the
/// fight death it follows.
pub fn group(deaths: &[Death], duration: f64) -> Vec<Fight> {
    let window = if duration > LONG_GAME { 15.0 } else { 12.0 };
    let mut fights: Vec<Fight> = Vec::new();

    for (index, death) in deaths.iter().enumerate() {
        // Joins the closest of the fights still open. One without positions on record
        // counts as closest, so replays without them keep grouping on time alone.
        let joined = fights
            .iter_mut()
            .rev()
            .filter(|fight| death.time - fight.end <= window)
            .filter_map(|fight| {
                let last = &deaths[*fight.deaths.last()?];
                match distance_squared(death, last) {
                    Some(d) if d > FIGHT_RADIUS * FIGHT_RADIUS => None,
                    d => Some((fight, d.unwrap_or(0.0))),
                }
            })
            .min_by(|a, b| a.1.total_cmp(&b.1));

        match joined {
            Some((fight, _)) => {
                fight.end = death.time;
                fight.deaths.push(index);
            }
            None => fights.push(Fight {
                start: death.time,
                end: death.time,
                deaths: vec![index],
                kind: FightKind::Pick,
            }),
        }
    }

    for fight in &mut fights {
        fight.kind = kind(&fight.deaths, deaths);
    }
    fights
}

/// `None` when either death has no position on record.
fn distance_squared(a: &Death, b: &Death) -> Option<f64> {
    let (dx, dy) = (a.x? - b.x?, a.y? - b.y?);
    Some(dx * dx + dy * dy)
}

fn kind(indices: &[usize], deaths: &[Death]) -> FightKind {
    match indices {
        [index] => {
            let death = &deaths[*index];
            if death.allies_nearby == Some(0) && death.killers.len() >= GANK_KILLERS {
                FightKind::Gank
            } else {
                FightKind::Pick
            }
        }
        // Two deaths still make a team fight when most of both teams fought, or when a
        // whole team was seen fighting even if the other side's presence is unknown.
        [_, _] => {
            let sides = involvement(indices, deaths);
            if sides.iter().all(|side| side.present >= TEAM_FIGHT_SIDE)
                || sides.iter().any(|side| side.distinct >= TEAM_SIZE)
            {
                FightKind::TeamFight
            } else {
                FightKind::Skirmish
            }
        }
        _ if indices.len() >= TEAM_FIGHT_DEATHS => FightKind::TeamFight,
        _ => FightKind::Pick,
    }
}

/// How many heroes of a team a fight involved.
struct Involvement {
    /// Distinct victims and killers seen.
    distinct: u8,
    /// `distinct`, or the teammates known near a victim as it died, whichever says more.
    present: u8,
}

fn involvement(indices: &[usize], deaths: &[Death]) -> [Involvement; 2] {
    let mut seen: [u16; 2] = [0, 0]; // Slots, as bitmasks.
    let mut nearby = [0u8; 2];
    let mut fallen = [0u8; 2];

    for &index in indices {
        let death = &deaths[index];
        let Some(team) = death.team.map(usize::from).filter(|&team| team < 2) else {
            continue;
        };
        seen[team] |= slot_bit(death.victim);
        for &killer in &death.killers {
            // A victim's killers are on the other team.
            seen[1 - team] |= slot_bit(killer);
        }
        if let Some(allies) = death.allies_nearby {
            // The victim itself and the teammates already down count too.
            let present = allies.saturating_add(1).saturating_add(fallen[team]);
            nearby[team] = nearby[team].max(present);
        }
        fallen[team] += 1;
    }

    [0, 1].map(|team| {
        let distinct = u8::try_from(seen[team].count_ones()).unwrap_or(u8::MAX);
        Involvement {
            distinct,
            present: distinct.max(nearby[team]),
        }
    })
}

fn slot_bit(slot: u8) -> u16 {
    1 << (slot % 16)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn death(time: f64, killers: &[u8], allies_nearby: Option<u8>) -> Death {
        Death {
            time,
            team: Some(0),
            victim: 1,
            killers: killers.to_vec(),
            killing_blow: killers.first().copied(),
            x: None,
            y: None,
            allies_nearby,
            near_players: vec![],
        }
    }

    fn death_at(time: f64, killers: &[u8], x: f64, y: f64) -> Death {
        Death {
            x: Some(x),
            y: Some(y),
            ..death(time, killers, None)
        }
    }

    #[test]
    fn groups_deaths_within_the_window_of_the_last_one() {
        let deaths = [
            death(10.0, &[6], None),
            death(20.0, &[6], None),
            death(31.0, &[6], None),
            death(50.0, &[6, 7, 8], Some(0)),
            death(100.0, &[6], None),
            death(110.0, &[6], None),
        ];
        let fights = group(&deaths, 600.0);
        let shape: Vec<_> = fights.iter().map(|f| (f.deaths.clone(), f.kind)).collect();
        assert_eq!(
            shape,
            [
                (vec![0, 1, 2], FightKind::TeamFight),
                (vec![3], FightKind::Gank),
                (vec![4, 5], FightKind::Skirmish),
            ]
        );
        assert_eq!((fights[0].start, fights[0].end), (10.0, 31.0));
    }

    #[test]
    fn widens_the_window_in_long_games() {
        let deaths = [death(10.0, &[6], None), death(24.0, &[6, 7, 8], None)];
        assert_eq!(group(&deaths, 600.0).len(), 2);
        assert_eq!(group(&deaths, 40.0 * 60.0).len(), 1);
    }

    #[test]
    fn splits_deaths_far_apart_on_the_map() {
        let deaths = [
            death_at(10.0, &[6], 50.0, 50.0),
            death_at(15.0, &[6], 150.0, 50.0),
        ];
        assert_eq!(group(&deaths, 600.0).len(), 2);
    }

    #[test]
    fn groups_on_time_alone_when_a_position_is_missing() {
        let deaths = [death_at(10.0, &[6], 50.0, 50.0), death(15.0, &[6], None)];
        assert_eq!(group(&deaths, 600.0).len(), 1);
    }

    #[test]
    fn follows_a_moving_fight() {
        let deaths = [
            death_at(10.0, &[6], 0.0, 0.0),
            death_at(20.0, &[6], 30.0, 0.0),
            death_at(30.0, &[6], 60.0, 0.0),
        ];
        assert_eq!(group(&deaths, 600.0).len(), 1);
    }

    #[test]
    fn joins_the_nearest_open_fight() {
        // A pick across the map must not break up the fight going on elsewhere.
        let deaths = [
            death_at(10.0, &[6], 100.0, 100.0),
            death_at(15.0, &[6], 10.0, 10.0),
            death_at(20.0, &[6], 100.0, 100.0),
            death_at(30.0, &[6], 100.0, 100.0),
        ];
        let fights = group(&deaths, 600.0);
        let shape: Vec<_> = fights.iter().map(|f| f.deaths.clone()).collect();
        assert_eq!(shape, [vec![0, 2, 3], vec![1]]);
    }

    #[test]
    fn upgrades_a_crowded_two_death_fight() {
        let deaths = [
            death(10.0, &[6, 7, 8, 9], None),
            Death {
                team: Some(1),
                victim: 6,
                ..death(15.0, &[1, 2, 3, 4], None)
            },
        ];
        assert_eq!(group(&deaths, 600.0)[0].kind, FightKind::TeamFight);
    }

    #[test]
    fn upgrades_a_two_death_fight_against_a_whole_team() {
        // All five enemies got credit, so it was a team fight even though nothing
        // places the victims' teammates.
        let wiped = [
            death(10.0, &[6, 7, 8, 9, 10], None),
            Death {
                victim: 2,
                ..death(13.0, &[6, 7, 8, 9, 10], None)
            },
        ];
        assert_eq!(group(&wiped, 600.0)[0].kind, FightKind::TeamFight);

        // Four killers aren't the whole team, so the victims' side still decides.
        let partial = [
            death(10.0, &[6, 7, 8, 9], None),
            Death {
                victim: 2,
                ..death(13.0, &[6, 7, 8, 9], None)
            },
        ];
        assert_eq!(group(&partial, 600.0)[0].kind, FightKind::Skirmish);
    }

    #[test]
    fn counts_allies_nearby_as_presence() {
        // Two allies fall to four enemies, with three more allies standing by the first.
        let crowded = [
            death(10.0, &[6, 7, 8, 9], Some(3)),
            Death {
                victim: 2,
                ..death(15.0, &[6], None)
            },
        ];
        assert_eq!(group(&crowded, 600.0)[0].kind, FightKind::TeamFight);

        let sparse = [
            death(10.0, &[6], Some(0)),
            Death {
                victim: 2,
                ..death(15.0, &[6], None)
            },
        ];
        assert_eq!(group(&sparse, 600.0)[0].kind, FightKind::Skirmish);
    }

    #[test]
    fn counts_prior_fight_deaths_as_presence() {
        // The second victim's two standing allies, plus itself and the first victim.
        let deaths = [
            death(10.0, &[6, 7], None),
            Death {
                victim: 2,
                ..death(15.0, &[8, 9], Some(2))
            },
        ];
        assert_eq!(group(&deaths, 600.0)[0].kind, FightKind::TeamFight);
    }

    #[test]
    fn keeps_a_small_trade_a_skirmish() {
        let deaths = [
            death(10.0, &[6], Some(1)),
            Death {
                team: Some(1),
                victim: 6,
                ..death(15.0, &[1], Some(1))
            },
        ];
        assert_eq!(group(&deaths, 600.0)[0].kind, FightKind::Skirmish);
    }
}
