//! The first team to draw blood, take a fort and reach level 10.

use crate::types::timeline::{Milestone, MilestoneKind, Timeline};

/// Reads the milestones off a timeline whose deaths, structures and levels are built.
pub fn reached(timeline: &Timeline) -> Vec<Milestone> {
    // Deaths and structures carry the team that lost them.
    let opponent = |team: Option<u8>| team.map(|team| 1 - team);
    let first_blood = timeline
        .deaths
        .first()
        .and_then(|death| Some((opponent(death.team)?, death.time)));
    let first_fort = timeline
        .structures
        .iter()
        .find(|structure| !structure.keep)
        .and_then(|fort| Some((opponent(fort.team)?, fort.time)));
    let first_ten = (0..2u8)
        .filter_map(|team| {
            timeline.levels[usize::from(team)]
                .iter()
                .find(|(_, level)| *level >= 10)
                .map(|&(time, _)| (team, time))
        })
        .min_by(|a, b| a.1.total_cmp(&b.1));

    [
        (MilestoneKind::Blood, first_blood),
        (MilestoneKind::Fort, first_fort),
        (MilestoneKind::Ten, first_ten),
    ]
    .into_iter()
    .filter_map(|(kind, reached)| reached.map(|(team, time)| Milestone { kind, team, time }))
    .collect()
}
