//! Counting pass over one game: what each rule judges. Runs the same way on the
//! open replay and on each game of the hero baseline.

use std::collections::{HashMap, HashSet};

use crate::types::timeline::{Death, Fight, FightKind, Timeline};

/// Game seconds after a death within which an enemy gain counts as its cost.
const PUNISH_SECS: f64 = 45.0;
/// Game seconds around an objective within which a death counts as near it.
const OBJECTIVE_SECS: f64 = 30.0;
/// Seconds the enemy has to answer an engage with a kill before it counts as unanswered.
const ANSWER_SECS: f64 = 5.0;
/// Most seconds between two takedowns of a multikill, the game's own window.
const MULTIKILL_SECS: f64 = 10.0;
/// Players on a team: a wipe takes them all down.
const TEAM_SIZE: usize = 5;
/// Deaths in a fight that take down a Lost Vikings player: one per Viking.
const VIKINGS: usize = 3;
/// Levels that unlock a talent tier.
const TALENT_LEVELS: [u32; 7] = [1, 4, 7, 10, 13, 16, 20];

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
    /// Seconds of the owner's longest life, from the gates opening to the first
    /// death, between two (respawn wait included) or from the last to the end.
    pub longest_life: f64,
    /// The longest enemy run of takedowns without dying, ended by a death
    /// credited to the owner.
    pub ended_streak: usize,
    /// Fights that took down every enemy player, with the owner involved.
    pub wipes: Wipes,
    /// The owner's longest run of takedowns between deaths.
    pub kill_streak: usize,
    /// The owner's most takedowns in a chain.
    pub multikill: usize,
    /// Killing blows on an enemy that had landed one on the owner, once per debt.
    pub vengeances: usize,
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
    pub missed: usize,
    pub joined: FightRecord,
    /// The record over the fights whose opening death involved the owner, the
    /// record a frontliner is judged on.
    pub started: FightRecord,
}

#[derive(Debug)]
pub struct FightRecord {
    pub count: usize,
    pub won: usize,
    pub lost: usize,
    /// Lost fights that started with the owner's team on a lower talent tier.
    pub lost_behind: usize,
}

#[derive(Debug)]
pub struct StolenCamps {
    pub count: usize,
}

#[derive(Debug)]
pub struct Wipes {
    pub count: usize,
}

#[derive(Debug)]
pub struct LanePressure {
    pub structures: usize,
    /// The owner's damage to minions, the soak proxy. `None` on games stored without
    /// it.
    pub soak: Option<f64>,
    pub soak_per_min: Option<f64>,
}

/// A game where nothing happened, for rule tests to build on.
#[cfg(test)]
pub fn empty() -> GameMetrics {
    game_metrics(&Timeline::default(), 600.0, 1, 0, None, None, &[])
}

/// Talent tiers unlocked at `level`.
fn tier(level: u32) -> usize {
    TALENT_LEVELS.iter().filter(|&&at| level >= at).count()
}

/// A team's level just before `time`, read off its level-ups, so a level-up from
/// a fight's opening kill doesn't count as already reached.
fn level_at(curve: &[(f64, u32)], time: f64) -> u32 {
    curve
        .iter()
        .take_while(|(at, _)| *at < time)
        .last()
        .map_or(1, |&(_, level)| level)
}

pub fn game_metrics(
    timeline: &Timeline,
    duration: f64,
    owner_slot: u8,
    ally_team: u8,
    owner_time_dead: Option<f64>,
    owner_minion_damage: Option<f64>,
    vikings: &[u8],
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
    let tier_at = |team: u8, time: f64| {
        timeline
            .levels
            .get(usize::from(team))
            .map_or(1, |curve| tier(level_at(curve, time)))
    };
    let behind =
        |fight: &Fight| tier_at(ally_team, fight.start) < tier_at(ally_team ^ 1, fight.start);

    // The record over the fights; equal deaths on both sides is a trade and
    // counts in neither.
    let record = |fights: &[&&Fight]| {
        fights.iter().fold(
            FightRecord {
                count: fights.len(),
                won: 0,
                lost: 0,
                lost_behind: 0,
            },
            |mut record, fight| {
                let taken = deaths_of(fight, false);
                let given = deaths_of(fight, true);
                match taken.cmp(&given) {
                    std::cmp::Ordering::Greater => record.won += 1,
                    std::cmp::Ordering::Less => {
                        record.lost += 1;
                        if behind(fight) {
                            record.lost_behind += 1;
                        }
                    }
                    std::cmp::Ordering::Equal => {}
                }
                record
            },
        )
    };

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

    let mut death_times: Vec<f64> = owner_deaths.iter().map(|d| d.time.max(0.0)).collect();
    death_times.push(duration);
    let longest_life = death_times
        .iter()
        .scan(0.0, |last, &time| {
            let gap = time - *last;
            *last = time;
            Some(gap)
        })
        .fold(0.0, f64::max);

    // Deaths come in time order, so each enemy's run is counted up to its death.
    let mut streaks: HashMap<u8, usize> = HashMap::new();
    let credited = |death: &Death| {
        death.killing_blow == Some(owner_slot) || death.killers.contains(&owner_slot)
    };
    let mut ended_streak = 0;
    for death in &timeline.deaths {
        match death.team {
            Some(team) if team == ally_team => {
                for &killer in &death.killers {
                    *streaks.entry(killer).or_default() += 1;
                }
            }
            Some(_) => {
                let streak = streaks.remove(&death.victim).unwrap_or(0);
                if credited(death) {
                    ended_streak = ended_streak.max(streak);
                }
            }
            None => {}
        }
    }

    let mut run = 0;
    let mut kill_streak = 0;
    let mut chain = 0;
    let mut multikill = 0;
    let mut last_takedown = f64::NEG_INFINITY;
    let mut owed: HashSet<u8> = HashSet::new();
    let mut vengeances = 0;
    for death in &timeline.deaths {
        if death.victim == owner_slot {
            run = 0;
            owed.extend(death.killing_blow);
            continue;
        }
        if !credited(death) {
            continue;
        }

        run += 1;
        kill_streak = kill_streak.max(run);

        chain = if death.time - last_takedown <= MULTIKILL_SECS {
            chain + 1
        } else {
            1
        };
        last_takedown = death.time;
        multikill = multikill.max(chain);

        if death.killing_blow == Some(owner_slot) && owed.remove(&death.victim) {
            vengeances += 1;
        }
    }

    let wiped = |fight: &Fight| {
        let mut down: HashMap<u8, usize> = HashMap::new();
        for &i in &fight.deaths {
            let death = &timeline.deaths[i];
            if death.team.is_some_and(|team| team != ally_team) {
                *down.entry(death.victim).or_default() += 1;
            }
        }
        let needed = |slot: &u8| if vikings.contains(slot) { VIKINGS } else { 1 };
        down.iter().filter(|(slot, &n)| n >= needed(slot)).count() >= TEAM_SIZE
    };
    let wipes = timeline
        .fights
        .iter()
        .filter(|fight| in_fight(fight) && wiped(fight))
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
            missed: team_fights.len() - joined.len(),
            joined: record(&joined),
            started: record(&started),
        },
        stolen_camps: StolenCamps { count: stolen },
        lane: LanePressure {
            structures,
            soak: owner_minion_damage,
            soak_per_min: owner_minion_damage
                .filter(|_| duration > 0.0)
                .map(|damage| damage / duration * 60.0),
        },
        longest_life,
        ended_streak,
        wipes: Wipes { count: wipes },
        kill_streak,
        multikill,
        vengeances,
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

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
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

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!((m.fights.joined.count, m.fights.joined.won), (2, 2));
        assert_eq!((m.fights.started.count, m.fights.started.won), (1, 1));
    }

    #[test]
    fn counts_losses_started_a_talent_tier_behind() {
        let lost = |time| vec![death(time, 0, 1, &[6]), death(time + 2.0, 0, 2, &[6])];
        let timeline = Timeline {
            deaths: [100.0, 200.0, 300.0, 400.0, 500.0]
                .into_iter()
                .flat_map(lost)
                .collect(),
            fights: vec![
                // 6 against 9: a talent tier down.
                fight(FightKind::TeamFight, vec![0, 1], 100.0),
                // 8 against 9: a level down on the same tier.
                fight(FightKind::TeamFight, vec![2, 3], 200.0),
                // 9 against 10: the heroic tier.
                fight(FightKind::TeamFight, vec![4, 5], 300.0),
                // 10 against 10.
                fight(FightKind::TeamFight, vec![6, 7], 400.0),
                // 10 against 12: 13 comes from the opening kill itself.
                fight(FightKind::TeamFight, vec![8, 9], 500.0),
            ],
            levels: [
                vec![(0.0, 1), (90.0, 6), (150.0, 8), (250.0, 9), (350.0, 10)],
                vec![(0.0, 1), (90.0, 9), (250.0, 10), (450.0, 12), (500.0, 13)],
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.fights.joined.lost, 5);
        assert_eq!(m.fights.joined.lost_behind, 2);
        assert_eq!(m.fights.started.lost_behind, 2);
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

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!((m.fights.joined.count, m.fights.joined.won), (1, 1));
        assert_eq!(m.fights.missed, 1);
        // Present at the first death counts as being there for the open.
        assert_eq!(m.fights.started.count, 1);
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

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
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

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
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
        let m = game_metrics(&timeline, 600.0, 1, 0, None, Some(600.0), &[]);
        assert_eq!(m.lane.structures, 2);
        assert_eq!(m.lane.soak, Some(600.0));
        assert_eq!(m.lane.soak_per_min, Some(60.0));

        let without = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(without.lane.soak_per_min, None);
    }

    #[test]
    fn measures_the_longest_life_from_start_to_end() {
        let timeline = Timeline {
            deaths: vec![death(100.0, 0, 1, &[6]), death(250.0, 0, 1, &[6])],
            ..Timeline::default()
        };
        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.longest_life, 350.0);

        let early = Timeline {
            deaths: vec![death(500.0, 0, 1, &[6]), death(550.0, 0, 1, &[6])],
            ..Timeline::default()
        };
        let m = game_metrics(&early, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.longest_life, 500.0);

        assert_eq!(empty().longest_life, 600.0);
    }

    #[test]
    fn keeps_the_longest_enemy_run_the_owner_ended() {
        let timeline = Timeline {
            deaths: vec![
                death(10.0, 0, 2, &[6]),
                death(20.0, 0, 3, &[6, 7]),
                death(30.0, 0, 4, &[6]),
                // Enemy 7 on one takedown.
                death(40.0, 1, 7, &[1]),
                // Enemy 6 on three, ended with the owner's help.
                death(50.0, 1, 6, &[2, 1]),
                death(60.0, 0, 2, &[6]),
                death(70.0, 0, 3, &[6]),
                death(80.0, 0, 4, &[6]),
                death(90.0, 0, 5, &[6]),
                // A longer run, ended without the owner.
                death(100.0, 1, 6, &[2]),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.ended_streak, 3);
    }

    #[test]
    fn needs_every_viking_down_for_a_wipe() {
        let enemy = |time, victim| Death {
            near_players: vec![1],
            ..death(time, 1, victim, &[2])
        };
        let wipe = |start: f64, vikings: usize| {
            let mut deaths: Vec<Death> = (6..=9).map(|slot| enemy(start, slot)).collect();
            deaths.extend((0..vikings).map(|_| enemy(start + 1.0, 10)));
            deaths
        };
        let mut deaths = wipe(100.0, 1);
        deaths.extend(wipe(200.0, 3));
        let timeline = Timeline {
            deaths,
            fights: vec![
                fight(FightKind::TeamFight, (0..5).collect(), 100.0),
                fight(FightKind::TeamFight, (5..12).collect(), 200.0),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.wipes.count, 2);
        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[10]);
        assert_eq!(m.wipes.count, 1);
    }

    #[test]
    fn runs_end_when_the_owner_dies() {
        let timeline = Timeline {
            deaths: vec![
                death(10.0, 1, 6, &[1]),
                death(100.0, 1, 7, &[2, 1]),
                death(200.0, 1, 8, &[2]),
                death(300.0, 1, 9, &[1]),
                death(400.0, 0, 1, &[6]),
                death(500.0, 1, 6, &[1]),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.kill_streak, 3);
    }

    #[test]
    fn chains_takedowns_ten_seconds_apart() {
        let timeline = Timeline {
            deaths: vec![
                death(100.0, 1, 6, &[1]),
                // Ten seconds from the last takedown, not from the first.
                death(110.0, 1, 7, &[1]),
                death(120.0, 1, 8, &[2, 1]),
                // Someone else's kill doesn't extend the chain.
                death(125.0, 1, 9, &[2]),
                death(130.5, 1, 10, &[1]),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.multikill, 3);
    }

    #[test]
    fn a_vengeance_needs_the_killing_blow_and_settles_the_debt() {
        let timeline = Timeline {
            deaths: vec![
                // Before the owner owes anything.
                death(10.0, 1, 6, &[1]),
                death(20.0, 0, 1, &[6, 7]),
                death(30.0, 0, 1, &[8]),
                // Enemy 7 only assisted on the owner's death.
                death(40.0, 1, 7, &[1]),
                // An assist on the enemy that landed the blow doesn't count.
                death(50.0, 1, 6, &[2, 1]),
                // A debt survives the owner's later deaths.
                death(60.0, 1, 6, &[1]),
                // Settled, so the same enemy doesn't count twice.
                death(70.0, 1, 6, &[1]),
                death(80.0, 1, 8, &[1]),
            ],
            ..Timeline::default()
        };

        let m = game_metrics(&timeline, 600.0, 1, 0, None, None, &[]);
        assert_eq!(m.vengeances, 2);
    }
}
