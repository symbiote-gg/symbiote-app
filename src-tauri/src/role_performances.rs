//! Each role's heroes scored on the stats that matter for it, against the best of
//! the role's heroes on either team, then each team's mean set head to head.

use std::cmp::Reverse;

use crate::types::hero::HeroRole;
use crate::types::replay::ReplayPlayerDetail;
use crate::types::role_performances::RoleStat::{
    self, DamageTakenShare, DeathShare, HardCc, Healing, HeroDamage, KillParticipation, Protection,
    SiegeDamage, TeamfightDamageTakenShare, Xp,
};
use crate::types::role_performances::{
    HeroScore, RolePerformance, RoleScore, ScorePart, Sides, StatAverage, StatColumn,
    UnscoredReason, UnscoredStat, Verdict,
};

/// How much each stat counts toward a hero's score, up to 3.
type Weights = &'static [(RoleStat, u8)];

const ROLE_ORDER: [HeroRole; 6] = [
    HeroRole::Tank,
    HeroRole::Bruiser,
    HeroRole::Healer,
    HeroRole::RangedAssassin,
    HeroRole::MeleeAssassin,
    HeroRole::Support,
];

const PUSHER_WEIGHTS: Weights = &[
    (HeroDamage, 2),
    (SiegeDamage, 2),
    (KillParticipation, 1),
    (DeathShare, 1),
];

/// Gap in score points under which two sides count as even. Smaller gaps are noise:
/// side scores are rounded means, and a single death moves a death share by more.
/// Across real games the side ahead by under 3 won no more often than chance.
/// The role performances subtitle in `en.json` states it, so update both together.
const EVEN_SCORE_MARGIN: i64 = 3;

fn role_weights(role: HeroRole) -> Weights {
    match role {
        HeroRole::Tank => &[
            (TeamfightDamageTakenShare, 3),
            (DeathShare, 2),
            (KillParticipation, 2),
            (Xp, 1),
        ],
        HeroRole::Bruiser => &[
            (Xp, 2),
            (HeroDamage, 2),
            (DamageTakenShare, 2),
            (DeathShare, 2),
        ],
        HeroRole::Healer => &[
            (Healing, 3),
            (DeathShare, 2),
            (KillParticipation, 1),
            (Protection, 1),
        ],
        HeroRole::RangedAssassin => &[
            (HeroDamage, 3),
            (KillParticipation, 2),
            (DeathShare, 2),
            (SiegeDamage, 1),
        ],
        HeroRole::MeleeAssassin => &[
            (HeroDamage, 3),
            (KillParticipation, 2),
            (DeathShare, 2),
            (HardCc, 1),
        ],
        HeroRole::Support => &[
            (Xp, 2),
            (KillParticipation, 2),
            (DeathShare, 2),
            (Protection, 1),
        ],
    }
}

/// Full weights for heroes their role's miss, by slug, in place of the role's:
/// pushers toward siege, shielders toward protection. Stats outside the role score
/// the hero but stay out of the role's columns. A hand-kept list, as the role data doesn't say.
fn hero_weights(slug: &str) -> Option<Weights> {
    Some(match slug {
        "Abathur" => &[(Xp, 3), (Protection, 2), (SiegeDamage, 2), (DeathShare, 1)],
        "Azmodan" | "Probius" | "Sylvanas" | "WitchDoctor" | "Zagara" => PUSHER_WEIGHTS,
        "LostVikings" => &[
            (SiegeDamage, 3),
            (Xp, 2),
            (KillParticipation, 2),
            (DeathShare, 2),
            (Protection, 1),
        ],
        "Medivh" => &[(Protection, 3), (KillParticipation, 1), (DeathShare, 1)],
        "Murky" => &[
            (HeroDamage, 3),
            (SiegeDamage, 3),
            (KillParticipation, 2),
            (DeathShare, 2),
            (HardCc, 1),
        ],
        "Zarya" => &[
            (Protection, 3),
            (KillParticipation, 2),
            (Xp, 1),
            (DeathShare, 1),
        ],
        _ => return None,
    })
}

fn weights_for(player: &ReplayPlayerDetail, role: HeroRole) -> Weights {
    hero_weights(&player.hero_slug).unwrap_or_else(|| role_weights(role))
}

/// Each team's sums the team relative stats are read against, so a team's kill lead
/// doesn't lift all its roles at once, nor a lost fight's damage sink them. A team's
/// deaths are also the other team's kills.
#[derive(Default)]
struct TeamTotals {
    deaths: [i64; 2],
    damage_taken: [i64; 2],
    teamfight_damage_taken: [i64; 2],
}

fn team_totals(players: &[ReplayPlayerDetail]) -> TeamTotals {
    let mut totals = TeamTotals::default();
    for player in players {
        let side = side(player);
        totals.deaths[side] += player.deaths.unwrap_or(0);
        totals.damage_taken[side] += player.damage_taken.unwrap_or(0);
        totals.teamfight_damage_taken[side] += player.teamfight_damage_taken.unwrap_or(0);
    }

    totals
}

fn side(player: &ReplayPlayerDetail) -> usize {
    usize::from(player.team == 1)
}

fn percent(part: i64, whole: i64) -> i64 {
    if whole == 0 {
        0
    } else {
        (part as f64 * 100.0 / whole as f64).round() as i64
    }
}

/// A team relative stat, but death share, as the hero's part and the team total it's
/// read against.
fn team_part(
    player: &ReplayPlayerDetail,
    stat: RoleStat,
    totals: &TeamTotals,
) -> Option<(i64, i64)> {
    let side = side(player);
    match stat {
        KillParticipation => Some((player.takedowns?, totals.deaths[1 - side])),
        DamageTakenShare => Some((player.damage_taken?, totals.damage_taken[side])),
        TeamfightDamageTakenShare => Some((
            player.teamfight_damage_taken?,
            totals.teamfight_damage_taken[side],
        )),
        _ => None,
    }
}

/// The stat as shown, the team relative ones as a whole percent.
fn value(player: &ReplayPlayerDetail, stat: RoleStat, totals: &TeamTotals) -> Option<i64> {
    match stat {
        HeroDamage => player.hero_damage,
        SiegeDamage => player.siege_damage,
        Healing => player.healing,
        Xp => player.xp,
        HardCc => player.hard_cc,
        Protection => player.protection,
        KillParticipation | DamageTakenShare | TeamfightDamageTakenShare => {
            let (part, team) = team_part(player, stat, totals)?;
            (team > 0).then(|| percent(part, team))
        }
        DeathShare => Some(percent(player.deaths?, totals.deaths[side(player)])),
    }
}

/// The stat as scored, unrounded. Death share adds a death to the hero and five to
/// the team, pulling few deaths toward an even fifth so a team that barely died
/// doesn't swing it, and keeping no deaths defined.
fn rate(player: &ReplayPlayerDetail, stat: RoleStat, totals: &TeamTotals) -> Option<f64> {
    match stat {
        KillParticipation | DamageTakenShare | TeamfightDamageTakenShare => {
            let (part, team) = team_part(player, stat, totals)?;
            (team > 0).then(|| part as f64 / team as f64)
        }
        DeathShare => Some((player.deaths? + 1) as f64 / (totals.deaths[side(player)] + 5) as f64),
        _ => value(player, stat, totals).map(|v| v as f64),
    }
}

/// Why a stat the hero is weighted on has no value or rate.
fn missing_reason(
    player: &ReplayPlayerDetail,
    stat: RoleStat,
    totals: &TeamTotals,
) -> UnscoredReason {
    if stat == KillParticipation
        && player.takedowns.is_some()
        && totals.deaths[1 - side(player)] == 0
    {
        UnscoredReason::NoTeamKills
    } else {
        UnscoredReason::NoData
    }
}

/// A rate against the best of the role's heroes. Death share compares the lowest to
/// the rate. `None` when no hero in the role had any, as there's no best to measure.
fn share(
    stat: RoleStat,
    rate: f64,
    in_role: &[&ReplayPlayerDetail],
    totals: &TeamTotals,
) -> Option<f64> {
    let rates = in_role.iter().filter_map(|p| self::rate(p, stat, totals));
    if stat == DeathShare {
        return Some(rates.fold(rate, f64::min) / rate);
    }

    let top = rates.fold(0.0, f64::max);
    (top > 0.0).then(|| rate / top)
}

fn points(score: f64) -> u8 {
    (score * 100.0).round() as u8
}

fn mean(values: impl IntoIterator<Item = f64>) -> Option<f64> {
    let (total, count) = values
        .into_iter()
        .fold((0.0, 0), |(total, count), value| (total + value, count + 1));

    (count > 0).then(|| total / f64::from(count))
}

/// A hero's score and the weighted mean of its parts' shares, unrounded.
fn score_hero(
    player: &ReplayPlayerDetail,
    role: HeroRole,
    in_role: &[&ReplayPlayerDetail],
    totals: &TeamTotals,
) -> (HeroScore, Option<f64>) {
    let mut parts = Vec::new();
    let mut unscored = Vec::new();
    for &(stat, weight) in weights_for(player, role) {
        let (Some(value), Some(rate)) = (value(player, stat, totals), rate(player, stat, totals))
        else {
            unscored.push(UnscoredStat {
                stat,
                reason: missing_reason(player, stat, totals),
            });
            continue;
        };

        let Some(share) = share(stat, rate, in_role, totals) else {
            unscored.push(UnscoredStat {
                stat,
                reason: UnscoredReason::NoneInRole,
            });
            continue;
        };

        parts.push(ScorePart {
            stat,
            value,
            share,
            weight,
            points: 0,
        });
    }

    let total_weight: u32 = parts.iter().map(|p| u32::from(p.weight)).sum();
    let score = (total_weight > 0).then(|| {
        parts
            .iter()
            .map(|p| p.share * f64::from(p.weight))
            .sum::<f64>()
            / f64::from(total_weight)
    });

    if let Some(score) = score {
        let points = part_points(&parts, total_weight, score);
        for (part, points) in parts.iter_mut().zip(points) {
            part.points = points;
        }
    }

    let hero = HeroScore {
        player_id: player.player_id,
        score: score.map(points),
        parts,
        unscored,
    };
    (hero, score)
}

/// Each part's slice of the hero's points, rounded by largest remainder so they
/// sum to the rounded score rather than drifting a point off it.
fn part_points(parts: &[ScorePart], total_weight: u32, score: f64) -> Vec<u8> {
    let raw: Vec<f64> = parts
        .iter()
        .map(|p| p.share * f64::from(p.weight) / f64::from(total_weight) * 100.0)
        .collect();
    let mut points: Vec<u8> = raw.iter().map(|r| r.floor() as u8).collect();

    let floored: u8 = points.iter().sum();
    let leftover = usize::from(self::points(score).saturating_sub(floored));

    let mut by_remainder: Vec<usize> = (0..raw.len()).collect();
    by_remainder.sort_by(|&a, &b| (raw[b] - raw[b].floor()).total_cmp(&(raw[a] - raw[a].floor())));
    for &index in by_remainder.iter().take(leftover) {
        points[index] += 1;
    }

    points
}

fn score_side(
    side: &[&ReplayPlayerDetail],
    role: HeroRole,
    in_role: &[&ReplayPlayerDetail],
    totals: &TeamTotals,
) -> (Vec<HeroScore>, Option<u8>) {
    let (heroes, scores): (Vec<_>, Vec<_>) = side
        .iter()
        .map(|player| score_hero(player, role, in_role, totals))
        .unzip();
    let score = mean(scores.into_iter().flatten()).map(points);
    (heroes, score)
}

/// The role's stats weighted for any of its heroes, the most total weight across
/// them first, the role's own order breaking ties. Stats a hero adds outside the role aren't
/// columns.
fn columns(role: HeroRole, in_role: &[&ReplayPlayerDetail]) -> Vec<StatColumn> {
    // (stat, total weight across heroes, heaviest single weight)
    let mut totals: Vec<(RoleStat, u32, u8)> = role_weights(role)
        .iter()
        .map(|&(stat, _)| (stat, 0, 0))
        .collect();
    for player in in_role {
        for &(stat, weight) in weights_for(player, role) {
            if let Some((_, total, max)) = totals.iter_mut().find(|(s, _, _)| *s == stat) {
                *total += u32::from(weight);
                *max = (*max).max(weight);
            }
        }
    }

    totals.retain(|&(_, total, _)| total > 0);
    totals.sort_by_key(|&(_, total, _)| Reverse(total));
    totals
        .into_iter()
        .map(|(stat, _, weight)| StatColumn { stat, weight })
        .collect()
}

/// The stats outside the role any of its heroes is scored on, in first-seen order.
fn extras(role: HeroRole, in_role: &[&ReplayPlayerDetail]) -> Vec<RoleStat> {
    let role_weights = role_weights(role);

    let mut extras = Vec::new();
    for player in in_role {
        for &(stat, _) in weights_for(player, role) {
            if role_weights.iter().all(|&(s, _)| s != stat) && !extras.contains(&stat) {
                extras.push(stat);
            }
        }
    }

    extras
}

fn average(side: &[&ReplayPlayerDetail], stat: RoleStat, totals: &TeamTotals) -> Option<f64> {
    mean(
        side.iter()
            .filter_map(|p| value(p, stat, totals))
            .map(|v| v as f64),
    )
}

fn verdict(gap: i64) -> Verdict {
    if gap.abs() < EVEN_SCORE_MARGIN {
        Verdict::Even
    } else if gap > 0 {
        Verdict::Ally
    } else {
        Verdict::Enemy
    }
}

fn compare_role(
    role: HeroRole,
    players: &[ReplayPlayerDetail],
    ally_team: i64,
    totals: &TeamTotals,
) -> RolePerformance {
    let in_role: Vec<_> = players
        .iter()
        .filter(|p| p.hero_role == Some(role))
        .collect();
    let (ally, enemy): (Vec<_>, Vec<_>) = in_role.iter().partition(|p| p.team == ally_team);

    let kits_differ = kits_differ(role, &in_role);
    let ((ally_heroes, ally_score), (enemy_heroes, enemy_score)) = if kits_differ {
        (unscored_side(&ally), unscored_side(&enemy))
    } else {
        (
            score_side(&ally, role, &in_role, totals),
            score_side(&enemy, role, &in_role, totals),
        )
    };
    let gap = ally_score
        .zip(enemy_score)
        .map(|(ally, enemy)| i64::from(ally) - i64::from(enemy));

    let columns = columns(role, &in_role);
    let mut stats: Vec<_> = columns
        .iter()
        .map(|column| column.stat)
        .chain(extras(role, &in_role))
        .collect();
    stats.sort();

    let stats = stats
        .into_iter()
        .map(|stat| StatAverage {
            stat,
            ally: average(&ally, stat, totals),
            enemy: average(&enemy, stat, totals),
        })
        .collect();

    RolePerformance {
        role,
        score: RoleScore {
            ally: ally_score,
            enemy: enemy_score,
            gap,
            verdict: gap.map(verdict),
        },
        heroes: Sides {
            ally: ally_heroes,
            enemy: enemy_heroes,
        },
        stats,
        columns,
        kits_differ,
    }
}

/// Whether the role's heroes are scored on different stats. Every support plays a
/// kit of its own, and Abathur's lead in XP, siege and staying alive is one Medivh
/// never plays for, so supports only go head to head on the same kit.
fn kits_differ(role: HeroRole, in_role: &[&ReplayPlayerDetail]) -> bool {
    role == HeroRole::Support
        && in_role
            .windows(2)
            .any(|pair| weights_for(pair[0], role) != weights_for(pair[1], role))
}

fn unscored_side(side: &[&ReplayPlayerDetail]) -> (Vec<HeroScore>, Option<u8>) {
    let heroes = side
        .iter()
        .map(|player| HeroScore {
            player_id: player.player_id,
            score: None,
            parts: Vec::new(),
            unscored: Vec::new(),
        })
        .collect();
    (heroes, None)
}

/// Each role either team played: the roles both teams had first, the owner's
/// leading among them, then the ones only one team had. Heroes with no known role
/// are left out.
pub fn compare(
    players: &[ReplayPlayerDetail],
    ally_team: i64,
    owner_role: Option<HeroRole>,
) -> Vec<RolePerformance> {
    let order = owner_role.into_iter().chain(
        ROLE_ORDER
            .into_iter()
            .filter(|&role| Some(role) != owner_role),
    );

    let totals = team_totals(players);
    let mut roles: Vec<_> = order
        .map(|role| compare_role(role, players, ally_team, &totals))
        .filter(|r| !r.heroes.ally.is_empty() || !r.heroes.enemy.is_empty())
        .collect();
    roles.sort_by_key(|r| r.heroes.ally.is_empty() || r.heroes.enemy.is_empty());
    roles
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The team relative stats take raw takedowns, deaths and damage taken.
    fn player(
        player_id: i64,
        team: i64,
        slug: &str,
        role: HeroRole,
        stats: &[(RoleStat, i64)],
    ) -> ReplayPlayerDetail {
        let mut player = ReplayPlayerDetail {
            player_id,
            team,
            hero_slug: slug.to_owned(),
            hero_role: Some(role),
            ..Default::default()
        };
        for &(stat, value) in stats {
            let field = match stat {
                HeroDamage => &mut player.hero_damage,
                SiegeDamage => &mut player.siege_damage,
                Healing => &mut player.healing,
                DamageTakenShare => &mut player.damage_taken,
                TeamfightDamageTakenShare => &mut player.teamfight_damage_taken,
                Xp => &mut player.xp,
                HardCc => &mut player.hard_cc,
                Protection => &mut player.protection,
                KillParticipation => &mut player.takedowns,
                DeathShare => &mut player.deaths,
            };
            *field = Some(value);
        }
        player
    }

    fn healer(
        player_id: i64,
        team: i64,
        healing: i64,
        takedowns: i64,
        deaths: i64,
    ) -> ReplayPlayerDetail {
        player(
            player_id,
            team,
            "Brightwing",
            HeroRole::Healer,
            &[
                (Healing, healing),
                (DeathShare, deaths),
                (KillParticipation, takedowns),
                (Protection, 0),
            ],
        )
    }

    /// A tank adding `deaths` to its team's.
    fn tank(player_id: i64, team: i64, deaths: i64) -> ReplayPlayerDetail {
        player(
            player_id,
            team,
            "Muradin",
            HeroRole::Tank,
            &[(Healing, 1000), (DeathShare, deaths)],
        )
    }

    fn healers(roles: &[RolePerformance]) -> &RolePerformance {
        roles.iter().find(|r| r.role == HeroRole::Healer).unwrap()
    }

    #[test]
    fn shares_measure_against_the_best_in_the_role() {
        // Team deaths 2 and 8, so 8 and 2 kills.
        let players = [
            healer(1, 0, 100, 6, 1),
            healer(2, 1, 50, 2, 3),
            tank(3, 0, 1),
            tank(4, 1, 5),
        ];

        let roles = compare(&players, 0, None);
        let healers = healers(&roles);
        let part_of = |stat| {
            healers.heroes.enemy[0]
                .parts
                .iter()
                .find(|p| p.stat == stat)
                .unwrap()
        };
        assert_eq!(part_of(Healing).share, 0.5);
        assert_eq!(part_of(KillParticipation).share, 1.0);
        assert_eq!(part_of(KillParticipation).value, 100);
        assert_eq!(part_of(DeathShare).share, (2.0 / 7.0) / (4.0 / 13.0));
        assert_eq!(part_of(DeathShare).value, 38);
        assert_eq!(healers.heroes.ally[0].score, Some(96));
    }

    #[test]
    fn unscored_stats_leave_the_score() {
        let players = [
            healer(1, 0, 100, 0, 0),
            player(
                2,
                1,
                "Brightwing",
                HeroRole::Healer,
                &[(DeathShare, 0), (KillParticipation, 0), (Protection, 0)],
            ),
        ];

        let roles = compare(&players, 0, None);
        let hero = &healers(&roles).heroes.enemy[0];
        let unscored: Vec<_> = hero.unscored.iter().map(|u| (u.stat, u.reason)).collect();
        assert_eq!(
            unscored,
            [
                (Healing, UnscoredReason::NoData),
                (KillParticipation, UnscoredReason::NoTeamKills),
                (Protection, UnscoredReason::NoneInRole),
            ]
        );
        assert_eq!(hero.score, Some(100));
    }

    #[test]
    fn no_team_kills_leave_kill_participation_out() {
        // Team deaths 0 and 3: only the ally team got kills.
        let players = [
            healer(1, 0, 100, 2, 0),
            healer(2, 1, 80, 0, 1),
            tank(3, 1, 2),
        ];

        let roles = compare(&players, 0, None);
        let healers = healers(&roles);
        let ally = &healers.heroes.ally[0];
        let enemy = &healers.heroes.enemy[0];

        let ally_kp = ally.parts.iter().find(|p| p.stat == KillParticipation);
        assert_eq!(ally_kp.map(|p| p.share), Some(1.0));
        assert!(enemy.parts.iter().all(|p| p.stat != KillParticipation));
        assert!(enemy
            .unscored
            .iter()
            .any(|u| u.stat == KillParticipation && u.reason == UnscoredReason::NoTeamKills));
    }

    #[test]
    fn a_kill_lead_alone_moves_no_role() {
        // Team deaths 10 and 20: each healer took half its team's kills and a fifth
        // of its deaths, on twice the takedowns or half the deaths.
        let players = [
            healer(1, 0, 100, 10, 2),
            healer(2, 1, 100, 5, 4),
            tank(3, 0, 8),
            tank(4, 1, 16),
        ];

        let roles = compare(&players, 0, None);
        let score = &healers(&roles).score;
        assert_eq!(score.gap, Some(0));
        assert_eq!(score.verdict, Some(Verdict::Even));
    }

    #[test]
    fn damage_taken_reads_against_the_team() {
        // The losing team took twice the teamfight damage, so its tank took more
        // but a smaller part of its team's.
        let fights = |player_id, team, slug, role, taken| {
            player(
                player_id,
                team,
                slug,
                role,
                &[(TeamfightDamageTakenShare, taken)],
            )
        };
        let players = [
            fights(1, 0, "Muradin", HeroRole::Tank, 30_000),
            fights(2, 0, "Sonya", HeroRole::Bruiser, 30_000),
            fights(3, 1, "Muradin", HeroRole::Tank, 40_000),
            fights(4, 1, "Sonya", HeroRole::Bruiser, 80_000),
        ];

        let roles = compare(&players, 0, None);
        let tanks = roles.iter().find(|r| r.role == HeroRole::Tank).unwrap();
        let part = |hero: &HeroScore| {
            let part = hero
                .parts
                .iter()
                .find(|p| p.stat == TeamfightDamageTakenShare);
            part.map(|p| (p.value, p.share)).unwrap()
        };
        assert_eq!(part(&tanks.heroes.ally[0]), (50, 1.0));
        assert_eq!(part(&tanks.heroes.enemy[0]), (33, (1.0 / 3.0) / 0.5));
    }

    #[test]
    fn part_points_sum_to_the_score() {
        let part = |weight| ScorePart {
            stat: KillParticipation,
            value: 1,
            share: 1.0,
            weight,
            points: 0,
        };

        // Three thirds floor to 33 each, one short of the 100 shown.
        let thirds = [part(1), part(1), part(1)];
        assert_eq!(part_points(&thirds, 3, 1.0), [34, 33, 33]);

        let players = [healer(1, 0, 100, 3, 0), healer(2, 1, 50, 0, 3)];
        let role = &compare(&players, 0, None)[0];
        for hero in role.heroes.ally.iter().chain(&role.heroes.enemy) {
            let total: u8 = hero.parts.iter().map(|p| p.points).sum();
            assert_eq!(Some(total), hero.score);
        }
    }

    #[test]
    fn the_verdict_reads_the_rounded_gap() {
        // No one had takedowns or protection, so healing is 3 of the 5 weights left
        // and 3% less of it is 1.8 points.
        let close = [healer(1, 0, 100, 0, 0), healer(2, 1, 97, 0, 0)];
        let score = &compare(&close, 0, None)[0].score;
        assert_eq!(score.gap, Some(2));
        assert_eq!(score.verdict, Some(Verdict::Even));

        let edge = [healer(1, 0, 100, 0, 0), healer(2, 1, 95, 0, 0)];
        let score = &compare(&edge, 0, None)[0].score;
        assert_eq!(score.gap, Some(3));
        assert_eq!(score.verdict, Some(Verdict::Ally));

        let wide = [healer(1, 0, 100, 0, 0), healer(2, 1, 50, 0, 0)];
        let score = &compare(&wide, 1, None)[0].score;
        assert_eq!(score.gap, Some(-30));
        assert_eq!(score.verdict, Some(Verdict::Enemy));
    }

    #[test]
    fn columns_take_the_heaviest_weight_across_heroes() {
        let players = [
            player(1, 0, "Jaina", HeroRole::RangedAssassin, &[]),
            player(2, 1, "Sylvanas", HeroRole::RangedAssassin, &[]),
        ];

        let columns = &compare(&players, 0, None)[0].columns;
        let weights: Vec<_> = columns.iter().map(|c| (c.stat, c.weight)).collect();
        assert_eq!(
            weights,
            [
                (HeroDamage, 3),
                (KillParticipation, 2),
                (DeathShare, 2),
                (SiegeDamage, 2)
            ]
        );
    }

    #[test]
    fn overrides_score_stats_outside_the_role_columns() {
        let players = [
            player(1, 0, "Valeera", HeroRole::MeleeAssassin, &[(DeathShare, 1)]),
            player(
                2,
                0,
                "Murky",
                HeroRole::MeleeAssassin,
                &[(DeathShare, 9), (SiegeDamage, 50_000)],
            ),
        ];

        let role = &compare(&players, 0, None)[0];
        let stats: Vec<_> = role.columns.iter().map(|c| c.stat).collect();
        assert_eq!(stats, [HeroDamage, KillParticipation, DeathShare, HardCc]);

        let averaged: Vec<_> = role.stats.iter().map(|s| s.stat).collect();
        assert_eq!(
            averaged,
            [
                HeroDamage,
                SiegeDamage,
                HardCc,
                KillParticipation,
                DeathShare
            ]
        );

        let murky: Vec<_> = role.heroes.ally[1].parts.iter().map(|p| p.stat).collect();
        assert_eq!(murky, [SiegeDamage, DeathShare]);
    }

    #[test]
    fn roles_list_shared_first_the_owners_leading() {
        let players = [
            healer(1, 0, 100, 0, 0),
            healer(2, 1, 100, 0, 0),
            player(3, 0, "Muradin", HeroRole::Tank, &[]),
            player(4, 0, "Jaina", HeroRole::RangedAssassin, &[]),
            player(5, 1, "Valla", HeroRole::RangedAssassin, &[]),
        ];

        let roles: Vec<_> = compare(&players, 0, Some(HeroRole::RangedAssassin))
            .into_iter()
            .map(|r| (r.role, r.heroes.ally.len(), r.heroes.enemy.len()))
            .collect();
        assert_eq!(
            roles,
            [
                (HeroRole::RangedAssassin, 1, 1),
                (HeroRole::Healer, 1, 1),
                (HeroRole::Tank, 1, 0),
            ]
        );
    }

    #[test]
    fn supports_only_go_head_to_head_on_the_same_kit() {
        let support = |player_id, team, slug| {
            player(
                player_id,
                team,
                slug,
                HeroRole::Support,
                &[(Xp, 10_000), (Protection, 5_000), (DeathShare, 1)],
            )
        };
        let supports = |players: &[ReplayPlayerDetail]| {
            compare(players, 0, None)
                .into_iter()
                .find(|r| r.role == HeroRole::Support)
                .unwrap()
        };

        let cross = supports(&[support(1, 0, "Abathur"), support(2, 1, "Medivh")]);
        assert!(cross.kits_differ);
        assert_eq!(cross.score.verdict, None);
        assert_eq!(cross.score.ally, None);
        let mut heroes = cross.heroes.ally.iter().chain(&cross.heroes.enemy);
        assert!(heroes.all(|h| h.score.is_none() && h.parts.is_empty()));
        assert!(!cross.stats.is_empty());

        let same = supports(&[support(1, 0, "Abathur"), support(2, 1, "Abathur")]);
        assert!(!same.kits_differ);
        assert_eq!(same.score.verdict, Some(Verdict::Even));
    }
}
