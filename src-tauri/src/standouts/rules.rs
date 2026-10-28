//! The rules turning a game's metrics into standouts, best first: each fires only
//! when its pattern is strong enough to act on, so a clean game may have none.
//!
//! With a hero baseline, a rule judges the game against the player's usual on the
//! hero, so a habit that is simply how they play that hero isn't called out every
//! game. Without one (or when a rate's base is empty), it falls back to the
//! absolute thresholds.

use std::cmp::Ordering;
use std::collections::BTreeMap;

use super::baseline::HeroBaseline;
use super::metrics::GameMetrics;
use crate::types::hero::HeroRole;
use crate::types::standouts::{Figure, FigureUnit, Standout, StandoutId, Tone, Variant};

/// Most standouts shown, best first.
const MAX_STANDOUTS: usize = 4;
/// Share of the game spent dead that's worth calling out.
const TIME_DEAD_SHARE: f64 = 0.15;
/// Average seconds survived into lost fights that counts as staying too long.
const STAY_SECS: f64 = 8.0;
/// How much worse than the usual a rate has to be to call it out.
const WORSE: f64 = 1.25;

pub struct RuleContext<'a> {
    pub role: Option<HeroRole>,
    pub push: bool,
    pub abathur: bool,
    pub cheap_deaths: bool,
    pub baseline: Option<&'a HeroBaseline>,
}

impl RuleContext<'_> {
    fn frontline(&self) -> bool {
        matches!(self.role, Some(HeroRole::Tank | HeroRole::Bruiser))
    }

    fn tank(&self) -> bool {
        matches!(self.role, Some(HeroRole::Tank))
    }

    fn usual<T>(&self, pick: impl Fn(&HeroBaseline) -> T) -> Option<T> {
        self.baseline.map(pick)
    }
}

/// Whether a bad rule fires: against the usual when both rates are known, else
/// its absolute threshold.
fn worse_than_usual(rate: Option<f64>, usual: Option<f64>, absolute: bool) -> bool {
    match (rate, usual) {
        (Some(rate), Some(usual)) => rate >= usual * WORSE,
        _ => absolute,
    }
}

fn count_figure(value: usize, total: Option<usize>) -> Figure {
    Figure {
        value: value as f64,
        total: total.map(|t| t as i64),
        unit: FigureUnit::Count,
    }
}

fn standout(id: StandoutId, tone: Tone, figure: Figure) -> Standout {
    Standout {
        id,
        tone,
        figure,
        params: BTreeMap::new(),
        variant: None,
    }
}

/// One game's run through the rules, collecting what fired.
struct Evaluation<'a> {
    m: &'a GameMetrics,
    ctx: &'a RuleContext<'a>,
    found: Vec<Standout>,
}

impl Evaluation<'_> {
    /// No ally nearby. Solo laners are alone by trade, so bruisers are judged only
    /// near objectives, where the team expects them.
    fn alone_deaths(&mut self) {
        if self.ctx.push {
            return;
        }

        let bruiser = matches!(self.ctx.role, Some(HeroRole::Bruiser));
        let alone = if bruiser {
            &self.m.alone_near
        } else {
            &self.m.alone
        };
        let usual = self
            .ctx
            .usual(|b| {
                if bruiser {
                    b.alone_near_rate
                } else {
                    b.alone_rate
                }
            })
            .flatten();
        let rate = (alone.known > 0).then(|| alone.count as f64 / alone.known as f64);

        if alone.count >= 2 && worse_than_usual(rate, usual, alone.count * 2 >= alone.known) {
            self.found.push(standout(
                StandoutId::AloneDeaths,
                Tone::Bad,
                count_figure(alone.count, Some(alone.known)),
            ));
        }
    }

    /// Picks and ganks.
    fn pick_deaths(&mut self) {
        if self.ctx.abathur {
            return;
        }

        let usual = self.ctx.usual(|b| b.pick_rate).flatten();
        let rate = (self.m.owner_deaths > 0)
            .then(|| self.m.picks.count as f64 / self.m.owner_deaths as f64);

        if self.m.picks.count >= 2
            && worse_than_usual(rate, usual, self.m.picks.count * 2 >= self.m.owner_deaths)
        {
            self.found.push(standout(
                StandoutId::PickDeaths,
                Tone::Bad,
                count_figure(self.m.picks.count, Some(self.m.owner_deaths)),
            ));
        }
    }

    /// First to fall, replaced for the frontline: going down first is their job,
    /// unless nobody followed the engage.
    fn first_dead(&mut self) {
        if self.ctx.push {
            return;
        }

        if self.ctx.frontline() {
            let usual = self.ctx.usual(|b| b.unanswered_rate).flatten();
            let rate = (self.m.unanswered.fight_deaths > 0)
                .then(|| self.m.unanswered.count as f64 / self.m.unanswered.fight_deaths as f64);

            if self.m.unanswered.count >= 2
                && worse_than_usual(
                    rate,
                    usual,
                    self.m.unanswered.count * 3 >= self.m.unanswered.fight_deaths,
                )
            {
                self.found.push(standout(
                    StandoutId::UnansweredEngages,
                    Tone::Bad,
                    count_figure(self.m.unanswered.count, None),
                ));
            }
        } else {
            let melee = matches!(self.ctx.role, Some(HeroRole::MeleeAssassin));
            // Divers go down a lot; only call it out when it opens half the fights.
            let factor = if melee { 2 } else { 3 };
            let usual = self.ctx.usual(|b| b.first_dead_rate).flatten();
            let rate = (self.m.first_dead.multi_death_fights > 0).then(|| {
                self.m.first_dead.count as f64 / self.m.first_dead.multi_death_fights as f64
            });

            if self.m.first_dead.count >= 2
                && worse_than_usual(
                    rate,
                    usual,
                    self.m.first_dead.count * factor >= self.m.first_dead.multi_death_fights,
                )
            {
                self.found.push(standout(
                    StandoutId::FirstDead,
                    Tone::Bad,
                    count_figure(
                        self.m.first_dead.count,
                        Some(self.m.first_dead.multi_death_fights),
                    ),
                ));
            }
        }
    }

    /// Stayed too long in lost fights.
    fn stayed_in_lost(&mut self) {
        let usual = self.ctx.usual(|b| b.avg_stay).flatten();
        let rate = (self.m.stays.count > 0).then_some(self.m.stays.avg_stay);

        if self.m.stays.count >= 2
            && worse_than_usual(rate, usual, self.m.stays.avg_stay >= STAY_SECS)
        {
            let mut stayed = standout(
                StandoutId::StayedInLost,
                Tone::Bad,
                Figure {
                    value: self.m.stays.avg_stay,
                    total: None,
                    unit: FigureUnit::Seconds,
                },
            );
            stayed
                .params
                .insert("count".to_owned(), self.m.stays.count as i64);
            self.found.push(stayed);
        }
    }

    fn deaths_punished(&mut self) {
        let usual = self.ctx.usual(|b| b.punished_rate).flatten();
        let rate = (self.m.owner_deaths > 0)
            .then(|| self.m.punished.count as f64 / self.m.owner_deaths as f64);

        if self.m.punished.count >= 2 && worse_than_usual(rate, usual, true) {
            self.found.push(standout(
                StandoutId::DeathsPunished,
                Tone::Bad,
                count_figure(self.m.punished.count, Some(self.m.owner_deaths)),
            ));
        }
    }

    /// Time dead says nothing when a death costs only seconds, as on Murky or a
    /// lone Viking.
    fn time_dead(&mut self) {
        if self.ctx.cheap_deaths {
            return;
        }

        let usual = self.ctx.usual(|b| b.time_dead_share).flatten();
        if let Some(share) = self
            .m
            .time_dead_share
            .filter(|&share| worse_than_usual(Some(share), usual, share >= TIME_DEAD_SHARE))
        {
            let mut dead = standout(
                StandoutId::TimeDead,
                Tone::Bad,
                Figure {
                    value: self.m.time_dead.unwrap_or(0.0).round(),
                    total: None,
                    unit: FigureUnit::Duration,
                },
            );
            dead.params
                .insert("percent".to_owned(), (share * 100.0).round() as i64);
            self.found.push(dead);
        }
    }

    /// Team-fight record. A tank is judged on the fights it started: picking them
    /// is the job.
    fn fight_record(&mut self) {
        if self.ctx.push {
            return;
        }

        let tank = self.ctx.tank();
        let (joined, won, lost) = if tank {
            let started = &self.m.fights.started;
            (started.joined, started.won, started.lost)
        } else {
            (self.m.fights.joined, self.m.fights.won, self.m.fights.lost)
        };

        if joined >= 2 {
            // An even record, trades included, is neither a win nor a cost.
            let tone = match won.cmp(&lost) {
                Ordering::Greater => Tone::Good,
                Ordering::Equal => Tone::Watch,
                Ordering::Less => Tone::Bad,
            };
            let mut record = standout(
                StandoutId::FightRecord,
                tone,
                count_figure(won, Some(joined)),
            );
            record.variant = tank.then_some(Variant::Tank);
            self.found.push(record);
        }
    }

    fn missed_fights(&mut self) {
        if self.ctx.push {
            return;
        }

        let missed = self.m.fights.missed;
        let usual = self.ctx.usual(|b| b.miss_rate).flatten();
        let rate = (self.m.fights.total > 0).then(|| missed as f64 / self.m.fights.total as f64);

        if missed >= 2 && worse_than_usual(rate, usual, true) {
            self.found.push(standout(
                StandoutId::MissedFights,
                Tone::Watch,
                count_figure(missed, Some(self.m.fights.total)),
            ));
        }
    }

    /// Showing up twice is routine; showing up every time needs a real sample.
    fn all_fights(&mut self) {
        if self.ctx.push {
            return;
        }

        if self.m.fights.total >= 3 && self.m.fights.missed == 0 {
            self.found.push(standout(
                StandoutId::AllFights,
                Tone::Good,
                count_figure(self.m.fights.total, Some(self.m.fights.total)),
            ));
        }
    }

    /// Lane pressure, the push hero's "keep doing it".
    fn lane_pressure(&mut self) {
        if !self.ctx.push {
            return;
        }

        let usual_structures = self.ctx.usual(|b| b.structures_per_game);
        let usual_soak = self.ctx.usual(|b| b.soak_per_min).flatten();
        let structures_ok = self.m.lane.structures >= 2
            && usual_structures.is_none_or(|usual| self.m.lane.structures as f64 >= usual);
        let soak_ok = self
            .m
            .lane
            .soak_per_min
            .zip(usual_soak)
            .is_some_and(|(soak, usual)| soak >= usual);

        // The tile's figure is structures taken, so soak alone can't carry it.
        if structures_ok || (soak_ok && self.m.lane.structures > 0) {
            self.found.push(standout(
                StandoutId::LanePressure,
                Tone::Good,
                count_figure(self.m.lane.structures, None),
            ));
        }
    }

    fn stolen_camps(&mut self) {
        let usual = self.ctx.usual(|b| b.stolen_per_game);
        let count = self.m.stolen_camps.count;

        if count >= 2 && worse_than_usual(Some(count as f64), usual, true) {
            self.found.push(standout(
                StandoutId::StolenCamps,
                Tone::Watch,
                count_figure(count, None),
            ));
        }
    }
}

pub fn evaluate(m: &GameMetrics, ctx: &RuleContext) -> Vec<Standout> {
    let mut e = Evaluation {
        m,
        ctx,
        found: Vec::new(),
    };

    e.alone_deaths();
    e.pick_deaths();
    e.first_dead();
    e.stayed_in_lost();
    e.deaths_punished();
    e.time_dead();
    e.fight_record();
    e.missed_fights();
    e.all_fights();
    e.lane_pressure();
    e.stolen_camps();

    e.found.truncate(MAX_STANDOUTS);
    e.found
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::standouts::metrics;

    fn usual() -> HeroBaseline {
        HeroBaseline {
            alone_rate: None,
            alone_near_rate: None,
            pick_rate: None,
            first_dead_rate: None,
            unanswered_rate: None,
            avg_stay: None,
            punished_rate: None,
            time_dead_share: None,
            miss_rate: None,
            stolen_per_game: 0.0,
            structures_per_game: 0.0,
            soak_per_min: None,
        }
    }

    fn ctx(baseline: Option<&HeroBaseline>) -> RuleContext<'_> {
        RuleContext {
            role: None,
            push: false,
            abathur: false,
            cheap_deaths: false,
            baseline,
        }
    }

    fn ids(items: &[Standout]) -> Vec<StandoutId> {
        items.iter().map(|t| t.id).collect()
    }

    fn find(items: &[Standout], id: StandoutId) -> &Standout {
        items.iter().find(|t| t.id == id).unwrap()
    }

    #[test]
    fn judges_against_the_usual_when_known() {
        // 2 picks in 8 deaths: under the absolute half, so silent on its own.
        let mut m = metrics::empty();
        m.owner_deaths = 8;
        m.picks.count = 2;
        let items = evaluate(&m, &ctx(None));
        assert!(ids(&items).is_empty());

        // Against a usual of 1 in 5, a quarter is exactly 25% worse: it fires.
        let mut base = usual();
        base.pick_rate = Some(0.2);
        let items = evaluate(&m, &ctx(Some(&base)));
        assert_eq!(ids(&items), [StandoutId::PickDeaths]);

        // A usual just above that stays quiet.
        base.pick_rate = Some(0.201);
        let items = evaluate(&m, &ctx(Some(&base)));
        assert!(ids(&items).is_empty());

        // And the absolute threshold no longer fires over a matching usual.
        m.picks.count = 4;
        base.pick_rate = Some(0.5);
        let items = evaluate(&m, &ctx(Some(&base)));
        assert!(ids(&items).is_empty());
    }

    #[test]
    fn push_heroes_skip_fight_rules_and_gain_lane_pressure() {
        let mut m = metrics::empty();
        m.owner_deaths = 4;
        m.picks.count = 2;
        m.alone.count = 3;
        m.alone.known = 4;
        m.first_dead.count = 2;
        m.first_dead.multi_death_fights = 3;
        m.time_dead = Some(120.0);
        m.time_dead_share = Some(0.2);
        m.fights.total = 5;
        m.fights.joined = 2;
        m.fights.missed = 3;
        m.lane.structures = 2;

        let mut push = ctx(None);
        push.push = true;
        let items = evaluate(&m, &push);

        assert_eq!(
            ids(&items),
            [
                StandoutId::PickDeaths,
                StandoutId::TimeDead,
                StandoutId::LanePressure
            ]
        );
    }

    #[test]
    fn cheap_death_heroes_and_abathur_have_their_own_exceptions() {
        let mut m = metrics::empty();
        m.owner_deaths = 4;
        m.picks.count = 2;
        m.time_dead = Some(120.0);
        m.time_dead_share = Some(0.2);

        let mut vikings = ctx(None);
        vikings.push = true;
        vikings.cheap_deaths = true;
        let items = evaluate(&m, &vikings);
        assert_eq!(ids(&items), [StandoutId::PickDeaths]);

        let mut abathur = ctx(None);
        abathur.push = true;
        abathur.abathur = true;
        let items = evaluate(&m, &abathur);
        assert_eq!(ids(&items), [StandoutId::TimeDead]);
    }

    #[test]
    fn the_frontline_is_judged_on_unanswered_engages() {
        let mut m = metrics::empty();
        m.first_dead.count = 3;
        m.first_dead.multi_death_fights = 4;
        m.unanswered.count = 2;
        m.unanswered.fight_deaths = 6;
        m.fights.total = 4;
        m.fights.joined = 3;
        m.fights.won = 3;
        m.fights.missed = 1;
        m.fights.started.joined = 2;
        m.fights.started.lost = 2;

        let mut tank = ctx(None);
        tank.role = Some(HeroRole::Tank);
        let items = evaluate(&m, &tank);

        assert_eq!(
            ids(&items),
            [StandoutId::UnansweredEngages, StandoutId::FightRecord]
        );
        let record = find(&items, StandoutId::FightRecord);
        assert_eq!(record.variant, Some(Variant::Tank));
        assert_eq!(record.tone, Tone::Bad);
        assert_eq!(record.figure.value, 0.0);
        assert_eq!(record.figure.total, Some(2));
    }

    #[test]
    fn divers_get_a_higher_first_dead_threshold() {
        let mut m = metrics::empty();
        m.owner_deaths = 2;
        m.first_dead.count = 2;
        m.first_dead.multi_death_fights = 5;

        let mut melee = ctx(None);
        melee.role = Some(HeroRole::MeleeAssassin);
        let items = evaluate(&m, &melee);
        assert!(ids(&items).is_empty());

        let mut ranged = ctx(None);
        ranged.role = Some(HeroRole::RangedAssassin);
        let items = evaluate(&m, &ranged);
        assert_eq!(ids(&items), [StandoutId::FirstDead]);

        m.first_dead.count = 3;
        m.first_dead.multi_death_fights = 6;
        let items = evaluate(&m, &melee);
        assert_eq!(ids(&items), [StandoutId::FirstDead]);
    }

    #[test]
    fn bruisers_are_judged_alone_only_near_objectives() {
        let mut m = metrics::empty();
        m.owner_deaths = 4;
        m.alone.count = 3;
        m.alone.known = 4;

        let mut bruiser = ctx(None);
        bruiser.role = Some(HeroRole::Bruiser);
        let items = evaluate(&m, &bruiser);
        assert!(ids(&items).is_empty());

        m.alone_near.count = 2;
        m.alone_near.known = 2;
        let items = evaluate(&m, &bruiser);
        let alone = find(&items, StandoutId::AloneDeaths);
        assert_eq!(alone.figure.total, Some(2));
    }

    #[test]
    fn a_winning_record_reads_good() {
        let mut m = metrics::empty();
        m.fights.total = 4;
        m.fights.joined = 4;
        m.fights.won = 3;
        m.fights.lost = 1;

        let items = evaluate(&m, &ctx(None));
        assert_eq!(find(&items, StandoutId::FightRecord).tone, Tone::Good);
        assert_eq!(find(&items, StandoutId::AllFights).tone, Tone::Good);
    }

    #[test]
    fn an_even_record_is_only_worth_a_look() {
        let mut m = metrics::empty();
        m.fights.total = 2;
        m.fights.joined = 2;

        let items = evaluate(&m, &ctx(None));
        assert_eq!(find(&items, StandoutId::FightRecord).tone, Tone::Watch);
    }

    #[test]
    fn lane_pressure_fires_on_structures_or_soak() {
        let mut push = ctx(None);
        push.push = true;

        let mut m = metrics::empty();
        m.lane.structures = 1;
        let items = evaluate(&m, &push);
        assert!(ids(&items).is_empty());

        // One fort is below the absolute bar, but the soak beats the usual.
        let mut base = usual();
        base.structures_per_game = 3.0;
        base.soak_per_min = Some(100.0);
        m.lane.soak_per_min = Some(120.0);
        let mut push_base = ctx(Some(&base));
        push_base.push = true;
        let items = evaluate(&m, &push_base);
        let lane = find(&items, StandoutId::LanePressure);
        assert_eq!(lane.tone, Tone::Good);

        // Soak alone, with no structure to show as the figure, stays quiet.
        m.lane.structures = 0;
        let items = evaluate(&m, &push_base);
        assert!(ids(&items).is_empty());
    }

    #[test]
    fn still_shows_the_four_best() {
        let mut m = metrics::empty();
        m.owner_deaths = 4;
        m.alone.count = 3;
        m.alone.known = 4;
        m.picks.count = 3;
        m.first_dead.count = 3;
        m.first_dead.multi_death_fights = 4;
        m.stays.count = 2;
        m.stays.avg_stay = 10.0;
        m.punished.count = 2;

        let items = evaluate(&m, &ctx(None));
        assert_eq!(items.len(), 4);
        assert!(!ids(&items).contains(&StandoutId::DeathsPunished));
    }
}
