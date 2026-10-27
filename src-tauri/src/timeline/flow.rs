//! Tells how a game went for its winner: a stomp, a comeback, a close game or a
//! controlled win.
//!
//! Reads the winner's XP lead over the game, as a share of the teams' mean XP, along
//! with the kills and forts each team took, and when the forts fell.

use crate::types::replay::GameFlow;
use crate::types::timeline::Timeline;

/// The lead before this swings on a single fight, so it's left out.
const EARLY: f64 = 3.0 * 60.0;
const MIN_SAMPLES: usize = 3;
/// Leads under this don't count as either team being ahead.
const SWING: f64 = 0.04;

const COMEBACK_LEAD: f64 = 0.12;
const COMEBACK_SHARE: f64 = 0.4;
/// How far into the game the loser was last clearly ahead.
const COMEBACK_LATE: f64 = 0.65;
/// Forts the winner was down while clearly behind on XP.
const COMEBACK_FORTS: i64 = 2;

const STOMP_FINAL_LEAD: f64 = 0.2;
/// A lead held all game can shrink late as the XP totals grow, ending under
/// `STOMP_FINAL_LEAD`.
const STOMP_MEAN_LEAD: f64 = 0.15;
const STOMP_KILL_RATIO: i64 = 2;
const STOMP_DURATION: f64 = 15.0 * 60.0;
const STOMP_FORTS: i64 = 3;
const STOMP_FORTS_BY: f64 = 10.0 * 60.0;
const STOMP_SIGNS: usize = 2;

/// The mean lead, so a single early spike can't make a game uneven.
const CLOSE_LEAD: f64 = 0.06;
const CLOSE_SWINGS: usize = 2;
const CLOSE_KILL_GAP: i64 = 5;
const CLOSE_KILL_SHARE: f64 = 0.25;
const CLOSE_FORT_GAP: i64 = 2;

const CONTROLLED_SHARE: f64 = 0.75;

/// Reads the flow of a game lasting `duration` seconds won by `winner`, or `None`
/// when it has none or too few XP samples to tell.
pub fn read(timeline: &Timeline, winner: u8, duration: f64) -> Option<GameFlow> {
    let winner = usize::from(winner);
    let loser = 1 - winner;
    let leads: Vec<(f64, f64)> = timeline.xp[winner]
        .iter()
        .zip(&timeline.xp[loser])
        .filter(|((time, _), _)| *time >= EARLY)
        .map(|(&(time, ours), &(_, theirs))| (time, (ours - theirs) / ((ours + theirs) / 2.0)))
        .collect();
    if leads.len() < MIN_SAMPLES {
        return None;
    }

    let samples = leads.len() as f64;
    let behind = leads.iter().filter(|(_, lead)| *lead <= -SWING).count() as f64 / samples;
    // Leads too slim to tell count as ahead, so a level down early doesn't spoil a win.
    let ahead = 1.0 - behind;
    let setback = leads.iter().map(|(_, lead)| -lead).fold(0.0, f64::max);
    let floor = leads
        .iter()
        .map(|(_, lead)| *lead)
        .fold(f64::INFINITY, f64::min);
    let mean_lead = leads.iter().map(|(_, lead)| lead.abs()).sum::<f64>() / samples;
    let final_lead = leads.last().map_or(0.0, |(_, lead)| *lead);
    let last_behind = leads
        .iter()
        .rev()
        .find(|(_, lead)| *lead <= -SWING)
        .map_or(0.0, |(time, _)| time / duration);

    let mut kills = [0i64; 2];
    for death in &timeline.deaths {
        if let Some(team) = death.team {
            kills[1 - usize::from(team)] += 1;
        }
    }
    let mut forts_lost = [0i64; 2];
    let mut early_forts_lost = [0i64; 2];
    let mut fort_deficit = 0;
    for structure in &timeline.structures {
        let Some(team) = structure.team else {
            continue;
        };
        forts_lost[usize::from(team)] += 1;
        if structure.time <= STOMP_FORTS_BY {
            early_forts_lost[usize::from(team)] += 1;
        }
        // The next sample is the first to count the fort's XP.
        let lead = leads.iter().find(|(time, _)| *time >= structure.time);
        if lead.is_some_and(|(_, lead)| *lead <= -SWING) {
            fort_deficit = fort_deficit.max(forts_lost[winner] - forts_lost[loser]);
        }
    }
    let fast_forts = early_forts_lost[loser] >= STOMP_FORTS && early_forts_lost[winner] <= 1;

    let late_turnaround = behind >= COMEBACK_SHARE && last_behind >= COMEBACK_LATE;
    if setback >= COMEBACK_LEAD && (late_turnaround || fort_deficit >= COMEBACK_FORTS) {
        return Some(GameFlow::Comeback);
    }

    // Clearly ahead throughout, as final totals alone can come from a late push. Forts
    // taken fast can't, so never being clearly behind is enough then.
    if floor >= SWING || (fast_forts && floor > -SWING) {
        let signs = [
            final_lead >= STOMP_FINAL_LEAD || mean_lead >= STOMP_MEAN_LEAD,
            kills[winner] >= STOMP_KILL_RATIO * kills[loser].max(1),
            forts_lost[winner] <= 1 && forts_lost[loser] >= 2,
            fast_forts,
            duration <= STOMP_DURATION,
        ];
        if signs.into_iter().filter(|&sign| sign).count() >= STOMP_SIGNS {
            return Some(GameFlow::Stomp);
        }
    }

    let even_xp = mean_lead <= CLOSE_LEAD || swings(&leads) >= CLOSE_SWINGS;
    let kill_gap = (kills[0] - kills[1]).abs();
    let even_kills = kill_gap <= CLOSE_KILL_GAP
        || kill_gap as f64 <= CLOSE_KILL_SHARE * kills[0].max(kills[1]) as f64;
    let even_forts = (forts_lost[0] - forts_lost[1]).abs() <= CLOSE_FORT_GAP;
    if even_xp && even_kills && even_forts {
        return Some(GameFlow::Close);
    }

    (ahead >= CONTROLLED_SHARE && setback < COMEBACK_LEAD).then_some(GameFlow::Controlled)
}

/// Counts the times the lead changed hands, ignoring leads too slim to tell.
fn swings(leads: &[(f64, f64)]) -> usize {
    let mut swings = 0;
    let mut leader = None;
    for &(_, lead) in leads {
        if lead.abs() < SWING {
            continue;
        }
        let side = lead > 0.0;
        if leader.is_some_and(|leader| leader != side) {
            swings += 1;
        }
        leader = Some(side);
    }
    swings
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::timeline::{Death, Structure};

    /// A game won by team 0 with a sample a minute, its XP split so that team 0's
    /// lead is `leads[i]` at minute `i + 1`.
    fn timeline(leads: &[f64]) -> Timeline {
        let mut timeline = Timeline::default();
        for (minute, lead) in leads.iter().enumerate() {
            let time = (minute + 1) as f64 * 60.0;
            // Mean XP of 1000, so the gap is the lead.
            timeline.xp[0].push((time, 1000.0 + lead * 500.0));
            timeline.xp[1].push((time, 1000.0 - lead * 500.0));
        }
        timeline
    }

    fn kill(timeline: &mut Timeline, victim_team: u8, count: usize) {
        for _ in 0..count {
            timeline.deaths.push(Death {
                time: 0.0,
                team: Some(victim_team),
                victim: 0,
                killers: vec![],
                killing_blow: None,
                x: None,
                y: None,
                allies_nearby: None,
                near_players: vec![],
            });
        }
    }

    /// Forts of `team` falling at `minutes`.
    fn fort(timeline: &mut Timeline, team: u8, minutes: &[f64]) {
        for minute in minutes {
            timeline.structures.push(Structure {
                time: minute * 60.0,
                team: Some(team),
                keep: false,
                lane: None,
                killers: vec![],
                killing_blow: None,
            });
        }
        timeline
            .structures
            .sort_by(|a, b| a.time.total_cmp(&b.time));
    }

    #[test]
    fn reads_a_stomp() {
        let mut game = timeline(&[0.0, 0.0, 0.1, 0.15, 0.2, 0.22, 0.25, 0.25, 0.3, 0.3]);
        kill(&mut game, 1, 20);
        kill(&mut game, 0, 6);
        fort(&mut game, 1, &[10.0, 13.0, 15.0, 18.0]);
        assert_eq!(read(&game, 0, 1200.0), Some(GameFlow::Stomp));
    }

    #[test]
    fn reads_a_shrinking_lead_as_a_stomp() {
        let leads = [
            0.0, 0.0, 0.117, 0.166, 0.268, 0.287, 0.307, 0.302, 0.207, 0.226, 0.188, 0.213, 0.158,
            0.12, 0.157, 0.15, 0.129, 0.146, 0.16,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 18);
        kill(&mut game, 0, 3);
        fort(&mut game, 1, &[9.3, 11.8, 12.8, 15.5]);
        fort(&mut game, 0, &[9.7, 17.8]);
        assert_eq!(read(&game, 0, 1187.0), Some(GameFlow::Stomp));
    }

    #[test]
    fn reads_a_comeback() {
        let leads = [
            0.0, 0.0, -0.1, -0.15, -0.2, -0.2, -0.15, -0.15, -0.1, -0.05, -0.02, 0.05, 0.1,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 15);
        kill(&mut game, 0, 18);
        assert_eq!(read(&game, 0, 13.0 * 60.0), Some(GameFlow::Comeback));
    }

    #[test]
    fn reads_a_close_game() {
        let leads = [
            0.0, 0.0, 0.03, -0.06, -0.04, 0.06, 0.02, -0.07, -0.02, 0.05, 0.08,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 22);
        kill(&mut game, 0, 20);
        fort(&mut game, 1, &[5.0, 7.0, 10.0]);
        fort(&mut game, 0, &[6.0, 9.0]);
        assert_eq!(read(&game, 0, 11.0 * 60.0), Some(GameFlow::Close));
    }

    #[test]
    fn reads_a_see_saw_as_close() {
        let leads = [
            0.0, 0.0, -0.112, -0.071, -0.152, -0.001, 0.009, -0.005, -0.019, -0.036, -0.055,
            -0.079, -0.046, 0.018, 0.038, 0.115, 0.074, 0.042, 0.037, 0.004, -0.019, -0.048,
            -0.047, -0.01, 0.011, 0.046, 0.028, 0.033, 0.033,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 29);
        kill(&mut game, 0, 36);
        fort(&mut game, 1, &[8.0, 10.0, 15.0, 25.0]);
        fort(&mut game, 0, &[12.0, 20.0]);
        assert_eq!(read(&game, 0, 1809.0), Some(GameFlow::Close));
    }

    #[test]
    fn ignores_slim_deficits_for_comebacks() {
        let leads = [
            0.0, 0.0, -0.15, -0.1, -0.02, 0.02, -0.02, -0.03, 0.01, -0.02, -0.01, 0.02,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 20);
        kill(&mut game, 0, 18);
        assert_eq!(read(&game, 0, 12.0 * 60.0), Some(GameFlow::Close));
    }

    #[test]
    fn tells_nothing_of_a_lopsided_fight_count() {
        let mut game = timeline(&[0.0, 0.0, 0.03, -0.06, -0.04, 0.06, 0.02, 0.08]);
        kill(&mut game, 1, 40);
        kill(&mut game, 0, 15);
        assert_eq!(read(&game, 0, 8.0 * 60.0), None);
    }

    #[test]
    fn reads_a_controlled_win() {
        let mut game = timeline(&[0.0, 0.0, 0.1, 0.12, -0.03, 0.14, 0.16, 0.15]);
        kill(&mut game, 1, 25);
        kill(&mut game, 0, 20);
        fort(&mut game, 1, &[8.0, 12.0, 15.0]);
        fort(&mut game, 0, &[10.0, 18.0]);
        assert_eq!(read(&game, 0, 25.0 * 60.0), Some(GameFlow::Controlled));
    }

    #[test]
    fn reads_a_lead_that_dips_to_nothing_as_controlled() {
        let leads = [
            0.0, 0.0, 0.057, 0.073, 0.08, 0.071, 0.128, 0.113, 0.124, 0.125, 0.044, 0.035, 0.077,
            0.01, 0.004, 0.077, 0.144, 0.192, 0.239,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 24);
        kill(&mut game, 0, 11);
        fort(&mut game, 1, &[11.0, 13.0, 15.0, 17.0, 19.0]);
        fort(&mut game, 0, &[16.0]);
        assert_eq!(read(&game, 0, 1181.0), Some(GameFlow::Controlled));
    }

    #[test]
    fn reads_slim_early_deficits_as_controlled() {
        let leads = [
            0.0, 0.0, -0.013, -0.012, -0.059, -0.052, -0.035, 0.036, 0.062, -0.043, 0.076, 0.113,
            0.126, 0.14, 0.138, 0.131, 0.106, 0.146, 0.152, 0.173, 0.229,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 38);
        kill(&mut game, 0, 19);
        fort(&mut game, 1, &[10.5, 12.6, 16.0, 20.0, 20.1]);
        fort(&mut game, 0, &[10.2, 10.2]);
        assert_eq!(read(&game, 0, 1284.0), Some(GameFlow::Controlled));
    }

    #[test]
    fn tells_nothing_of_a_mid_game_turnaround() {
        let leads = [
            0.0, 0.0, -0.05, -0.04, -0.07, -0.07, -0.02, 0.01, 0.03, 0.08, 0.12, 0.12, 0.08, 0.07,
            0.15, 0.2,
        ];
        let mut game = timeline(&leads);
        kill(&mut game, 1, 17);
        kill(&mut game, 0, 8);
        fort(&mut game, 1, &[10.0, 12.0, 14.0, 16.0]);
        assert_eq!(read(&game, 0, 1020.0), None);
    }

    #[test]
    fn reads_fast_forts_as_a_stomp() {
        let leads = [
            0.0, 0.0, 0.02, 0.05, 0.06, 0.08, 0.09, 0.1, 0.1, 0.11, 0.12, 0.12, 0.13, 0.14, 0.14,
            0.15, 0.15, 0.16,
        ];
        let game = |forts: &[f64]| {
            let mut game = timeline(&leads);
            kill(&mut game, 1, 20);
            kill(&mut game, 0, 15);
            fort(&mut game, 1, forts);
            game
        };
        assert_eq!(
            read(&game(&[6.0, 8.0, 9.5]), 0, 18.0 * 60.0),
            Some(GameFlow::Stomp)
        );
        assert_eq!(
            read(&game(&[12.0, 14.0, 16.0]), 0, 18.0 * 60.0),
            Some(GameFlow::Controlled)
        );
    }

    const TURNAROUND: [f64; 16] = [
        0.0, 0.0, -0.08, -0.12, -0.15, -0.1, -0.03, 0.02, 0.06, 0.1, 0.12, 0.12, 0.1, 0.12, 0.15,
        0.18,
    ];

    #[test]
    fn reads_a_fort_deficit_as_a_comeback() {
        let mut game = timeline(&TURNAROUND);
        kill(&mut game, 1, 15);
        kill(&mut game, 0, 15);
        fort(&mut game, 0, &[3.5, 4.5]);
        fort(&mut game, 1, &[10.0, 12.0, 14.0]);
        assert_eq!(read(&game, 0, 16.0 * 60.0), Some(GameFlow::Comeback));
    }

    #[test]
    fn ignores_a_fort_deficit_while_ahead_on_xp() {
        let mut game = timeline(&TURNAROUND);
        kill(&mut game, 1, 15);
        kill(&mut game, 0, 15);
        fort(&mut game, 0, &[9.5, 10.5]);
        fort(&mut game, 1, &[12.0, 13.0, 14.0]);
        assert_eq!(read(&game, 0, 16.0 * 60.0), None);
    }

    #[test]
    fn needs_enough_samples() {
        let game = timeline(&[0.0, 0.0, 0.3, 0.3]);
        assert_eq!(read(&game, 0, 4.0 * 60.0), None);
    }
}
