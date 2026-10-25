//! Groups a game's deaths into fights.

use crate::types::timeline::{Death, Fight, FightKind};

/// Games longer than this get a wider window, as respawns take longer.
const LONG_GAME: f64 = 35.0 * 60.0;
const TEAM_FIGHT_DEATHS: usize = 3;
const GANK_KILLERS: usize = 3;

/// Groups `deaths`, in time order, so each one is within the window of the one before.
pub fn group(deaths: &[Death], duration: f64) -> Vec<Fight> {
    let window = if duration > LONG_GAME { 15.0 } else { 12.0 };
    let mut fights: Vec<Fight> = Vec::new();

    for (index, death) in deaths.iter().enumerate() {
        match fights.last_mut() {
            Some(fight) if death.time - fight.end <= window => {
                fight.end = death.time;
                fight.deaths.push(index);
            }
            _ => fights.push(Fight {
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

fn kind(indices: &[usize], deaths: &[Death]) -> FightKind {
    match indices {
        [index] => {
            let death = &deaths[*index];
            if death.alone == Some(true) && death.killers.len() >= GANK_KILLERS {
                FightKind::Gank
            } else {
                FightKind::Pick
            }
        }
        [_, _] => FightKind::Skirmish,
        _ if indices.len() >= TEAM_FIGHT_DEATHS => FightKind::TeamFight,
        _ => FightKind::Pick,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn death(time: f64, killers: &[u8], alone: Option<bool>) -> Death {
        Death {
            time,
            team: Some(0),
            victim: 1,
            killers: killers.to_vec(),
            killing_blow: killers.first().copied(),
            alone,
        }
    }

    #[test]
    fn groups_deaths_within_the_window_of_the_last_one() {
        let deaths = [
            death(10.0, &[6], None),
            death(20.0, &[6], None),
            death(31.0, &[6], None),
            death(50.0, &[6, 7, 8], Some(true)),
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
}
