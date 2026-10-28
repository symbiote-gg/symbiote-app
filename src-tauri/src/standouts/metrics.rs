//! Counting pass over one game: what each rule judges. Runs the same way on the
//! open replay and on each game of the hero baseline.

use std::collections::HashSet;

use crate::types::timeline::{Death, Fight, FightKind, Timeline, XpBreakdown};

/// Game seconds after a death within which an enemy gain counts as its cost.
const PUNISH_SECS: f64 = 45.0;
/// Game seconds around an objective within which a death counts as near it.
const OBJECTIVE_SECS: f64 = 30.0;
/// Seconds the enemy has to answer an engage with a kill before it counts as unanswered.
const ANSWER_SECS: f64 = 5.0;

#[derive(Debug)]
pub struct GameMetrics {
    pub owner_deaths: usize,
    /// Deaths with nobody around outside team fights, among those where allies
    /// nearby are known.
    pub alone: Alone,
    /// Like `alone`, but only deaths near an objective event, for solo laners
    /// whose job is to be elsewhere the rest of the time.
    pub alone_near: Alone,
    /// Owner deaths inside pick or gank fights.
    pub picks: Picks,
    /// Multi-death fights the owner's death opened.
    pub first_dead: FirstDead,
    /// Owner deaths in fights the enemy didn't answer with a kill: the engage
    /// cost a life and gained nothing.
    pub unanswered: Unanswered,
    /// Lost fights the owner died in after the opening death, and how deep in.
    pub stays: Stays,
    /// Owner deaths the enemy turned into a structure or objective.
    pub punished: Punished,
    pub time_dead: Option<f64>,
    /// `None` when the time dead is unknown or the game has no duration.
    pub time_dead_share: Option<f64>,
    /// Team fights, split by whether the owner took any part.
    pub fights: Fights,
    /// Camps the enemy captured on the owner's side of the map.
    pub stolen_camps: StolenCamps,
    /// Enemy structures the owner helped take, and lane XP soaked.
    pub lane: LanePressure,
}

#[derive(Debug)]
pub struct Alone {
    pub count: usize,
    pub known: usize,
}

#[derive(Debug)]
pub struct Picks {
    pub count: usize,
}

#[derive(Debug)]
pub struct FirstDead {
    pub count: usize,
    pub multi_death_fights: usize,
}

#[derive(Debug)]
pub struct Unanswered {
    pub count: usize,
    /// Owner deaths inside fights, the base the count is judged against.
    pub fight_deaths: usize,
}

#[derive(Debug)]
pub struct Stays {
    pub count: usize,
    pub avg_stay: f64,
}

#[derive(Debug)]
pub struct Punished {
    pub count: usize,
}

#[derive(Debug)]
pub struct Fights {
    pub total: usize,
    pub joined: usize,
    pub won: usize,
    pub lost: usize,
    pub missed: usize,
    /// The record over the fights whose opening death involved the owner, the
    /// record a frontliner is judged on.
    pub started: FightRecord,
}

#[derive(Debug)]
pub struct FightRecord {
    pub joined: usize,
    pub won: usize,
    pub lost: usize,
}

#[derive(Debug)]
pub struct StolenCamps {
    pub count: usize,
}

#[derive(Debug)]
pub struct LanePressure {
    pub structures: usize,
    /// Minion and creep XP earned, the soak proxy. `None` on games stored
    /// without the XP breakdown.
    pub soak: Option<f64>,
    pub soak_per_min: Option<f64>,
}

/// A game where nothing happened, for rule tests to build on.
#[cfg(test)]
pub fn empty() -> GameMetrics {
    game_metrics(&Timeline::default(), 600.0, 1, 0, None, None)
}

pub fn game_metrics(
    timeline: &Timeline,
    duration: f64,
    owner_slot: u8,
    ally_team: u8,
    owner_time_dead: Option<f64>,
    owner_xp: Option<&XpBreakdown>,
) -> GameMetrics {
    let owner_deaths: Vec<&Death> = timeline
        .deaths
        .iter()
        .filter(|d| d.victim == owner_slot)
        .collect();

    let known: Vec<(usize, &Death)> = timeline
        .deaths
        .iter()
        .enumerate()
        .filter(|(_, d)| d.victim == owner_slot && d.allies_nearby.is_some())
        .collect();
    // Nobody around in a team fight means the allies were already down or just out of
    // range, not that the owner was caught out.
    let team_fight_deaths: HashSet<usize> = timeline
        .fights
        .iter()
        .filter(|f| f.kind == FightKind::TeamFight)
        .flat_map(|f| f.deaths.iter().copied())
        .collect();
    let caught_alone = |&(index, death): &(usize, &Death)| {
        death.allies_nearby == Some(0) && !team_fight_deaths.contains(&index)
    };
    let alone = known.iter().filter(|entry| caught_alone(entry)).count();
    let near_objective = |time: f64| {
        timeline
            .objectives
            .iter()
            .any(|o| (o.time - time).abs() <= OBJECTIVE_SECS)
    };
    let known_near: Vec<&(usize, &Death)> = known
        .iter()
        .filter(|(_, d)| near_objective(d.time))
        .collect();
    let alone_near = known_near
        .iter()
        .filter(|entry| caught_alone(entry))
        .count();

    let caught_fights: Vec<&Fight> = timeline
        .fights
        .iter()
        .filter(|fight| {
            matches!(fight.kind, FightKind::Pick | FightKind::Gank)
                && fight
                    .deaths
                    .iter()
                    .any(|&i| timeline.deaths[i].victim == owner_slot)
        })
        .collect();
    let mut caught_times: Vec<f64> = caught_fights
        .iter()
        .flat_map(|fight| fight.deaths.iter())
        .map(|&i| &timeline.deaths[i])
        .filter(|d| d.victim == owner_slot)
        .map(|d| d.time)
        .collect();
    caught_times.sort_by(f64::total_cmp);
    caught_times.dedup();

    let answered = |fight: &Fight, time: f64| {
        fight.deaths.iter().any(|&i| {
            let death = &timeline.deaths[i];
            death.team.is_some_and(|team| team != ally_team)
                && death.time > time
                && death.time <= time + ANSWER_SECS
        })
    };
    let mut unanswered = 0;
    let mut fight_deaths = 0;
    for fight in &timeline.fights {
        for &i in &fight.deaths {
            let death = &timeline.deaths[i];
            if death.victim != owner_slot {
                continue;
            }
            fight_deaths += 1;
            if !answered(fight, death.time) {
                unanswered += 1;
            }
        }
    }

    // the fight's deaths are in time order, so the first index opened it
    let multi_death: Vec<&Fight> = timeline
        .fights
        .iter()
        .filter(|f| f.deaths.len() >= 2)
        .collect();
    let first_dead = multi_death
        .iter()
        .filter(|fight| timeline.deaths[fight.deaths[0]].victim == owner_slot)
        .count();

    let stays: Vec<f64> = timeline
        .fights
        .iter()
        .filter_map(|fight| {
            let deaths: Vec<&Death> = fight.deaths.iter().map(|&i| &timeline.deaths[i]).collect();
            let down = |ally: bool| {
                deaths
                    .iter()
                    .filter(|d| d.team.is_some_and(|team| (team == ally_team) == ally))
                    .count()
            };
            if down(true) <= down(false) {
                return None;
            }
            let mine = deaths.iter().position(|d| d.victim == owner_slot)?;
            if mine == 0 {
                return None;
            }
            Some(deaths[mine].time - fight.start)
        })
        .collect();
    let avg_stay = stays.iter().sum::<f64>() / (stays.len().max(1) as f64);

    let punished = |time: f64| {
        timeline
            .structures
            .iter()
            .any(|s| s.team == Some(ally_team) && s.time > time && s.time <= time + PUNISH_SECS)
            || timeline.objectives.iter().any(|o| {
                o.team.is_some_and(|team| team != ally_team)
                    && o.time > time
                    && o.time <= time + PUNISH_SECS
            })
    };

    let team_fights: Vec<&Fight> = timeline
        .fights
        .iter()
        .filter(|f| f.kind == FightKind::TeamFight)
        .collect();
    // Kill credit or placed near the death: a healer that only heals still counts.
    let involves = |death: &Death| {
        death.victim == owner_slot
            || death.killing_blow == Some(owner_slot)
            || death.killers.contains(&owner_slot)
            || death.near_players.contains(&owner_slot)
    };
    let in_fight = |fight: &Fight| fight.deaths.iter().any(|&i| involves(&timeline.deaths[i]));
    let joined: Vec<&&Fight> = team_fights.iter().filter(|f| in_fight(f)).collect();
    let started: Vec<&&Fight> = team_fights
        .iter()
        .filter(|fight| involves(&timeline.deaths[fight.deaths[0]]))
        .collect();
    let deaths_of = |fight: &Fight, ally: bool| {
        fight
            .deaths
            .iter()
            .filter(|&&i| {
                timeline.deaths[i]
                    .team
                    .is_some_and(|team| (team == ally_team) == ally)
            })
            .count()
    };
    // The (won, lost) record over the fights; equal deaths on both sides is a
    // trade and counts in neither.
    let record = |fights: &[&&Fight]| {
        fights.iter().fold((0, 0), |(won, lost), fight| {
            let taken = deaths_of(fight, false);
            let given = deaths_of(fight, true);
            match taken.cmp(&given) {
                std::cmp::Ordering::Greater => (won + 1, lost),
                std::cmp::Ordering::Less => (won, lost + 1),
                std::cmp::Ordering::Equal => (won, lost),
            }
        })
    };
    let (won, lost) = record(&joined);
    let (started_won, started_lost) = record(&started);

    let structures = timeline
        .structures
        .iter()
        .filter(|s| {
            s.team.is_some_and(|team| team != ally_team)
                && (s.killing_blow == Some(owner_slot) || s.killers.contains(&owner_slot))
        })
        .count();

    let stolen = timeline
        .camps
        .iter()
        .filter(|camp| camp.stolen && camp.team.is_some_and(|team| team != ally_team))
        .count();

    GameMetrics {
        owner_deaths: owner_deaths.len(),
        alone: Alone {
            count: alone,
            known: known.len(),
        },
        alone_near: Alone {
            count: alone_near,
            known: known_near.len(),
        },
        picks: Picks {
            count: caught_times.len(),
        },
        first_dead: FirstDead {
            count: first_dead,
            multi_death_fights: multi_death.len(),
        },
        unanswered: Unanswered {
            count: unanswered,
            fight_deaths,
        },
        stays: Stays {
            count: stays.len(),
            avg_stay,
        },
        punished: Punished {
            count: owner_deaths.iter().filter(|d| punished(d.time)).count(),
        },
        time_dead: owner_time_dead,
        time_dead_share: owner_time_dead
            .filter(|_| duration > 0.0)
            .map(|dead| dead / duration),
        fights: Fights {
            total: team_fights.len(),
            joined: joined.len(),
            won,
            lost,
            missed: team_fights.len() - joined.len(),
            started: FightRecord {
                joined: started.len(),
                won: started_won,
                lost: started_lost,
            },
        },
        stolen_camps: StolenCamps { count: stolen },
        lane: LanePressure {
            structures,
            soak: owner_xp.map(|xp| xp.minion + xp.creep),
            soak_per_min: owner_xp
                .filter(|_| duration > 0.0)
                .map(|xp| (xp.minion + xp.creep) / duration * 60.0),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::timeline::{Objective, Structure};

    fn death(time: f64, team: u8, victim: u8, killers: &[u8]) -> Death {
        Death {
            time,
            team: Some(team),
            victim,
            killers: killers.to_vec(),
            killing_blow: killers.first().copied(),
            x: None,
            y: None,
            allies_nearby: Some(1),
            near_players: vec![],
        }
    }

    fn fight(kind: FightKind, deaths: Vec<usize>, start: f64) -> Fight {
        Fight {
            start,
            end: start + 10.0,
            deaths,
            kind,
        }
    }

    fn objective(time: f64) -> Objective {
        Objective {
            time,
            kind: "x".to_owned(),
            team: Some(1),
            variant: None,
            race: None,
            held: None,
            summon: None,
            duel: None,
            altar: None,
            knight: None,
            raw: None,
        }
    }

    #[test]
    fn counts_unanswered_engages_with_a_five_second_window() {
        let timeline = Timeline {
            deaths: vec![
                // Answered on the edge: the enemy death lands exactly 5 seconds in.
                death(100.0, 0, 1, &[6]),
                death(105.0, 1, 6, &[1]),
                // Unanswered: the enemy death lands too late.
                death(200.0, 0, 1, &[7]),
                death(205.5, 1, 7, &[2]),
                // An ally death is no answer.
                death(300.0, 0, 1, &[8]),
                death(301.0, 0, 2, &[8]),
            ],
            fights: vec![
                fight(FightKind::Skirmish, vec![0, 1], 100.0),
                fight(FightKind::Skirmish, vec![2, 3], 200.0),
                fight(FightKind::TeamFight, vec![4, 5], 300.0),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None);
        assert_eq!(m.unanswered.fight_deaths, 3);
        assert_eq!(m.unanswered.count, 2);
    }

    #[test]
    fn splits_the_record_by_who_opened_the_fight() {
        let timeline = Timeline {
            deaths: vec![
                // Won fight the owner opened by drawing first blood onto itself.
                death(100.0, 0, 1, &[6]),
                death(102.0, 1, 6, &[2]),
                death(104.0, 1, 7, &[2]),
                // Won fight the owner joined late: an ally fell first.
                death(200.0, 0, 2, &[6]),
                death(202.0, 1, 6, &[1]),
                death(204.0, 1, 7, &[1]),
            ],
            fights: vec![
                fight(FightKind::TeamFight, vec![0, 1, 2], 100.0),
                fight(FightKind::TeamFight, vec![3, 4, 5], 200.0),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None);
        assert_eq!((m.fights.joined, m.fights.won), (2, 2));
        assert_eq!((m.fights.started.joined, m.fights.started.won), (1, 1));
    }

    #[test]
    fn joins_fights_by_standing_near_without_kill_credit() {
        // Won fight with only enemy deaths: the owner (a healer) healed but never
        // damaged, placed only by position.
        let near = |time, victim| Death {
            near_players: vec![1, 2],
            ..death(time, 1, victim, &[2])
        };
        let timeline = Timeline {
            deaths: vec![
                near(100.0, 6),
                near(102.0, 7),
                // Same shape without the owner nearby: missed.
                death(200.0, 1, 6, &[2]),
                death(202.0, 1, 7, &[2]),
            ],
            fights: vec![
                fight(FightKind::TeamFight, vec![0, 1], 100.0),
                fight(FightKind::TeamFight, vec![2, 3], 200.0),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None);
        assert_eq!((m.fights.joined, m.fights.won), (1, 1));
        assert_eq!(m.fights.missed, 1);
        // Present at the first death counts as being there for the open.
        assert_eq!(m.fights.started.joined, 1);
    }

    #[test]
    fn restricts_alone_near_to_deaths_around_objectives() {
        let alone = |time| Death {
            allies_nearby: Some(0),
            ..death(time, 0, 1, &[6])
        };
        let timeline = Timeline {
            deaths: vec![alone(120.0), alone(140.0)],
            objectives: vec![objective(100.0)],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None);
        assert_eq!((m.alone.count, m.alone.known), (2, 2));
        assert_eq!((m.alone_near.count, m.alone_near.known), (1, 1));
    }

    #[test]
    fn skips_alone_deaths_inside_team_fights() {
        let alone = |time, victim| Death {
            allies_nearby: Some(0),
            ..death(time, 0, victim, &[6, 7, 8])
        };
        let timeline = Timeline {
            deaths: vec![
                alone(100.0, 1),
                // Last one standing in a wipe: the allies are down, not away.
                alone(200.0, 2),
                alone(202.0, 3),
                alone(204.0, 1),
            ],
            fights: vec![
                fight(FightKind::Gank, vec![0], 100.0),
                fight(FightKind::TeamFight, vec![1, 2, 3], 200.0),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None);
        assert_eq!((m.alone.count, m.alone.known), (1, 2));
    }

    #[test]
    fn credits_enemy_structures_and_reads_the_soak_proxy() {
        let structure = |team: u8, killers: &[u8], killing_blow: Option<u8>| Structure {
            time: 100.0,
            team: Some(team),
            keep: false,
            lane: None,
            killers: killers.to_vec(),
            killing_blow,
        };
        let timeline = Timeline {
            structures: vec![
                structure(1, &[1, 2], None),
                structure(1, &[], Some(1)),
                structure(1, &[2], Some(2)),
                structure(0, &[1], Some(1)),
            ],
            ..Timeline::default()
        };
        let xp = XpBreakdown {
            minion: 400.0,
            creep: 200.0,
            hero: 900.0,
            ..XpBreakdown::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, Some(&xp));
        assert_eq!(m.lane.structures, 2);
        assert_eq!(m.lane.soak, Some(600.0));
        assert_eq!(m.lane.soak_per_min, Some(60.0));

        let without = game_metrics(&timeline, 600.0, 1, 0, None, None);
        assert_eq!(without.lane.soak_per_min, None);
    }
}
