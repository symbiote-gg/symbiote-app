//! A player's kills, deaths and assists, matched against the scoreboard.

use std::collections::HashMap;

use crate::types::replay::ReplayPlayerDetail;
use crate::types::timeline::{
    Death, DeathKind, DeathRole, Fight, KillLog, KillLogEntry, Timeline, UnplacedKills,
};

/// What the scoreboard says of a player, by slot.
#[derive(Debug, Clone, Copy)]
struct Scorer {
    slot: u8,
    team: u8,
    kills: Option<i64>,
}

/// Builds the kill log of the player in `owner_slot` from a timeline with its fights.
pub fn build(timeline: &Timeline, players: &[ReplayPlayerDetail], owner_slot: i64) -> KillLog {
    let scorers: Vec<_> = players
        .iter()
        .filter_map(|p| {
            Some(Scorer {
                slot: u8::try_from(p.slot).ok()?,
                team: u8::try_from(p.team).ok()?,
                kills: p.kills,
            })
        })
        .collect();
    let Ok(owner) = u8::try_from(owner_slot) else {
        return KillLog::default();
    };
    let entries = entries(&timeline.deaths, &timeline.fights, owner);
    let unplaced = unplaced(&timeline.deaths, &scorers, owner);
    place_certain_kills(entries, unplaced, &timeline.deaths)
}

fn entries(deaths: &[Death], fights: &[Fight], owner: u8) -> Vec<KillLogEntry> {
    fights
        .iter()
        .flat_map(|fight| {
            fight.deaths.iter().filter_map(move |&index| {
                let death = &deaths[index];
                Some(KillLogEntry {
                    death: index,
                    kind: kind(death, fight),
                    role: role(death, owner)?,
                })
            })
        })
        .collect()
}

fn kind(death: &Death, fight: &Fight) -> DeathKind {
    match (death.killers.len(), fight.deaths.len()) {
        (0, _) => DeathKind::Ai,
        (1, 1) => DeathKind::Solo,
        _ => fight.kind.into(),
    }
}

/// A takedown with no killing blow on record still counts as an assist.
fn role(death: &Death, slot: u8) -> Option<DeathRole> {
    if death.victim == slot {
        Some(DeathRole::Death)
    } else if death.killing_blow == Some(slot) {
        Some(DeathRole::Kill)
    } else if death.killers.contains(&slot) {
        Some(DeathRole::Assist)
    } else {
        None
    }
}

/// Places the owner's scoreboard kills no death places on the victims of the enemy
/// deaths without a killing blow that credit them: when no ally falls short of more of
/// those deaths than credit them, and the team's shortfalls add up to no more than
/// those deaths (a minion's kill credits no one).
fn unplaced(deaths: &[Death], scorers: &[Scorer], owner: u8) -> Option<UnplacedKills> {
    let team_of: HashMap<u8, u8> = scorers.iter().map(|s| (s.slot, s.team)).collect();
    let team = *team_of.get(&owner)?;

    let unplaced: Vec<usize> = (0..deaths.len())
        .filter(|&index| {
            let death = &deaths[index];
            death.killing_blow.is_none()
                && team_of
                    .get(&death.victim)
                    .is_some_and(|&victim| victim != team)
        })
        .collect();
    let credits = |slot: u8| -> Vec<usize> {
        unplaced
            .iter()
            .copied()
            .filter(|&index| deaths[index].killers.contains(&slot))
            .collect()
    };

    let mut total = 0;
    let mut count = 0;
    for scorer in scorers.iter().filter(|s| s.team == team) {
        let placed = deaths
            .iter()
            .filter(|d| d.killing_blow == Some(scorer.slot))
            .count();
        let short = scorer.kills? - i64::try_from(placed).ok()?;
        let credited = i64::try_from(credits(scorer.slot).len()).ok()?;
        if short < 0 || short > credited {
            return None;
        }
        total += short;
        if scorer.slot == owner {
            count = short;
        }
    }

    if total > i64::try_from(unplaced.len()).ok()? || count == 0 {
        return None;
    }

    let credited = credits(owner);
    let mut victims = Vec::new();
    for &index in &credited {
        if !victims.contains(&deaths[index].victim) {
            victims.push(deaths[index].victim);
        }
    }
    Some(UnplacedKills {
        victims,
        count,
        deaths: credited,
    })
}

/// Counts unplaced kills as kills when there are as many as takedowns they can be on:
/// each of those takedowns is one. Otherwise they stay unplaced.
fn place_certain_kills(
    mut entries: Vec<KillLogEntry>,
    unplaced: Option<UnplacedKills>,
    deaths: &[Death],
) -> KillLog {
    let Some(certain) = unplaced.as_ref().filter(|u| {
        u.victims.len() == 1 && usize::try_from(u.count).is_ok_and(|n| n == u.deaths.len())
    }) else {
        return KillLog { entries, unplaced };
    };

    for entry in &mut entries {
        let death = &deaths[entry.death];
        if entry.role == DeathRole::Assist
            && death.killing_blow.is_none()
            && death.victim == certain.victims[0]
            && certain.deaths.contains(&entry.death)
        {
            entry.role = DeathRole::Kill;
        }
    }
    KillLog {
        entries,
        unplaced: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::timeline::FightKind;

    const OWNER: u8 = 1;
    const ALLY: u8 = 2;
    const LEORIC: u8 = 6;
    const ENEMY: u8 = 7;

    fn death(time: f64, victim: u8, killers: &[u8], killing_blow: Option<u8>) -> Death {
        Death {
            time,
            team: Some(u8::from(victim > 5)),
            victim,
            killers: killers.to_vec(),
            killing_blow,
            alone: None,
        }
    }

    fn scorers(owner_kills: i64, ally_kills: i64) -> Vec<Scorer> {
        vec![
            Scorer {
                slot: OWNER,
                team: 0,
                kills: Some(owner_kills),
            },
            Scorer {
                slot: ALLY,
                team: 0,
                kills: Some(ally_kills),
            },
            Scorer {
                slot: LEORIC,
                team: 1,
                kills: Some(0),
            },
            Scorer {
                slot: ENEMY,
                team: 1,
                kills: Some(1),
            },
        ]
    }

    fn solo_fights(deaths: &[Death]) -> Vec<Fight> {
        (0..deaths.len())
            .map(|index| Fight {
                start: deaths[index].time,
                end: deaths[index].time,
                deaths: vec![index],
                kind: FightKind::Pick,
            })
            .collect()
    }

    #[test]
    fn reads_roles_and_kinds() {
        let deaths = [
            death(10.0, ENEMY, &[OWNER], Some(OWNER)),
            death(20.0, OWNER, &[ENEMY], Some(ENEMY)),
            death(30.0, ENEMY, &[OWNER, ALLY], Some(ALLY)),
            death(40.0, ENEMY, &[], None),
            death(50.0, ALLY, &[ENEMY], Some(ENEMY)),
        ];
        let entries = entries(&deaths, &solo_fights(&deaths), OWNER);
        let read: Vec<_> = entries.iter().map(|e| (e.death, e.kind, e.role)).collect();
        assert_eq!(
            read,
            [
                (0, DeathKind::Solo, DeathRole::Kill),
                (1, DeathKind::Solo, DeathRole::Death),
                (2, DeathKind::Pick, DeathRole::Assist),
            ]
        );
    }

    #[test]
    fn places_kills_on_leoric_when_certain() {
        let deaths = [
            death(10.0, LEORIC, &[OWNER, ALLY], None),
            death(20.0, LEORIC, &[OWNER], None),
            death(30.0, ENEMY, &[ALLY], Some(ALLY)),
        ];
        let unplaced = unplaced(&deaths, &scorers(2, 1), OWNER);
        assert_eq!(
            unplaced,
            Some(UnplacedKills {
                victims: vec![LEORIC],
                count: 2,
                deaths: vec![0, 1]
            })
        );

        let log = place_certain_kills(
            entries(&deaths, &solo_fights(&deaths), OWNER),
            unplaced,
            &deaths,
        );
        assert!(log.unplaced.is_none());
        assert!(log.entries.iter().all(|e| e.role == DeathRole::Kill));
    }

    #[test]
    fn keeps_kills_unplaced_when_uncertain() {
        let deaths = [
            death(10.0, LEORIC, &[OWNER, ALLY], None),
            death(20.0, LEORIC, &[OWNER], None),
        ];
        let unplaced = unplaced(&deaths, &scorers(1, 0), OWNER);
        assert_eq!(
            unplaced,
            Some(UnplacedKills {
                victims: vec![LEORIC],
                count: 1,
                deaths: vec![0, 1]
            })
        );
        let log = place_certain_kills(
            entries(&deaths, &solo_fights(&deaths), OWNER),
            unplaced,
            &deaths,
        );
        assert!(log.unplaced.is_some());
        assert!(log.entries.iter().all(|e| e.role == DeathRole::Assist));
    }

    #[test]
    fn places_nothing_when_the_scoreboard_disagrees() {
        let deaths = [death(10.0, LEORIC, &[OWNER], None)];
        // More kills than takedowns could account for.
        assert_eq!(unplaced(&deaths, &scorers(2, 0), OWNER), None);
        // No kill missing.
        assert_eq!(unplaced(&deaths, &scorers(0, 0), OWNER), None);
    }
}
