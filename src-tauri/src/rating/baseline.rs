//! Where a rate sits among other games' rates of the same stat: ranked among the
//! hero's games, and among its role's when the hero has few.

use std::collections::HashMap;

use super::{lower_is_better, rate, GameTotals, PlayerGame};
use crate::types::hero::HeroRole;
use crate::types::role_performances::RoleStat;

/// Same hero samples weigh `n / (n + BLEND_SAMPLES)` against the role's. Peers leave
/// out the owner's own games and a hero can't repeat on a team, so a hero the owner
/// mostly plays is only sampled from mirror picks.
const BLEND_SAMPLES: f64 = 30.0;

/// Kits sit higher or lower in their role than their players' skill alone would put
/// them, so a hero's rank in the role is shifted back by where its samples sit, the
/// shift trusted `n / (n + OFFSET_SAMPLES)`. With few mirror samples, a main is
/// otherwise scored on the kit more than on their play.
const OFFSET_SAMPLES: f64 = 5.0;

/// Under this many peer samples in the role there's no one to rank against.
const MIN_PEER_SAMPLES: usize = 30;

/// Under this many of the owner's games in a role there's no usual game to rank against.
pub const MIN_OWN_GAMES: usize = 10;

/// A stat most of a hero's players never put a number on isn't in its kit, so it
/// goes unscored rather than handing out a tie in the middle.
const NOT_IN_KIT: f64 = 0.75;

/// What a role needs before its rates rank anything.
enum Gate {
    RoleSamples(usize),
    RoleGames(usize),
}

/// Sorted rates by hero and by role, to rank a game's rates in.
pub struct Baseline {
    heroes: HashMap<(i64, RoleStat), Vec<f64>>,
    roles: HashMap<(HeroRole, RoleStat), Vec<f64>>,
    hero_games: HashMap<i64, usize>,
    role_games: HashMap<HeroRole, usize>,
    hero_roles: HashMap<i64, HeroRole>,
    /// How far above the middle of its role a hero's samples rank, already shrunk by
    /// their count. Empty when kits aren't corrected for.
    kit_offsets: HashMap<(i64, RoleStat), f64>,
    players: usize,
    gate: Gate,
}

impl Baseline {
    /// The other players in `games`, neither the owner nor AI, sampled on `stats`.
    /// A hero's rank in its role is corrected for where its kit sits.
    pub fn peers<'a>(
        games: impl IntoIterator<Item = (&'a [PlayerGame], &'a GameTotals)>,
        stats: &[RoleStat],
    ) -> Self {
        let mut baseline = Self::empty(Gate::RoleSamples(MIN_PEER_SAMPLES));
        for (game, totals) in games {
            for player in game.iter().filter(|p| !p.is_owner && !p.is_ai) {
                baseline.add(player, totals, stats);
            }
        }
        baseline.sort();
        baseline.offset_kits();
        baseline
    }

    /// The owner's own games in `games`, sampled on `stats`, so a rate ranks against
    /// their usual game.
    pub fn own<'a>(
        games: impl IntoIterator<Item = (&'a [PlayerGame], &'a GameTotals)>,
        stats: &[RoleStat],
    ) -> Self {
        let mut baseline = Self::empty(Gate::RoleGames(MIN_OWN_GAMES));
        for (game, totals) in games {
            for player in game.iter().filter(|p| p.is_owner) {
                baseline.add(player, totals, stats);
            }
        }
        baseline.sort();
        baseline
    }

    fn empty(gate: Gate) -> Self {
        Self {
            heroes: HashMap::new(),
            roles: HashMap::new(),
            hero_games: HashMap::new(),
            role_games: HashMap::new(),
            hero_roles: HashMap::new(),
            kit_offsets: HashMap::new(),
            players: 0,
            gate,
        }
    }

    /// Players without a role can't be ranked against one, so they're left out.
    fn add(&mut self, player: &PlayerGame, totals: &GameTotals, stats: &[RoleStat]) {
        let Some(role) = player.hero_role else {
            return;
        };

        self.players += 1;
        *self.hero_games.entry(player.hero_id).or_default() += 1;
        *self.role_games.entry(role).or_default() += 1;
        self.hero_roles.insert(player.hero_id, role);

        for &stat in stats {
            let Some(rate) = rate(player, stat, totals) else {
                continue;
            };

            self.heroes
                .entry((player.hero_id, stat))
                .or_default()
                .push(rate);
            self.roles.entry((role, stat)).or_default().push(rate);
        }
    }

    fn sort(&mut self) {
        for rates in self.heroes.values_mut().chain(self.roles.values_mut()) {
            rates.sort_by(f64::total_cmp);
        }
    }

    fn offset_kits(&mut self) {
        for (&(hero_id, stat), hero_rates) in &self.heroes {
            let Some(role_rates) = self
                .hero_roles
                .get(&hero_id)
                .and_then(|&role| self.roles.get(&(role, stat)))
            else {
                continue;
            };

            let samples = hero_rates.len() as f64;
            let mean_rank = hero_rates.iter().map(|&r| rank(role_rates, r)).sum::<f64>() / samples;
            let trust = samples / (samples + OFFSET_SAMPLES);
            self.kit_offsets
                .insert((hero_id, stat), (mean_rank - 0.5) * trust);
        }
    }

    /// How many players were sampled.
    pub fn players(&self) -> usize {
        self.players
    }

    pub fn hero_games(&self, hero_id: i64) -> usize {
        self.hero_games.get(&hero_id).copied().unwrap_or(0)
    }

    /// How much the stat's rank is read against the hero's games rather than the
    /// role's, from the hero's samples of that stat.
    pub fn hero_blend(&self, hero_id: i64, stat: RoleStat) -> f64 {
        self.heroes
            .get(&(hero_id, stat))
            .map_or(0.0, |rates| hero_weight(rates.len()))
    }

    /// The share of the baseline the rate does better than, from 0 to 1, or `None`
    /// when the role is too thin to rank in or the stat isn't in the hero's kit.
    pub fn percentile(
        &self,
        hero_id: i64,
        role: HeroRole,
        stat: RoleStat,
        rate: f64,
    ) -> Option<f64> {
        let role_rates = self.roles.get(&(role, stat))?;
        let enough = match self.gate {
            Gate::RoleSamples(min) => role_rates.len() >= min,
            Gate::RoleGames(min) => self.role_games.get(&role).copied().unwrap_or(0) >= min,
        };
        if !enough {
            return None;
        }

        let hero_rates = self.heroes.get(&(hero_id, stat));
        let weight = self.hero_blend(hero_id, stat);

        let zeros = weight * hero_rates.map_or(0.0, |rates| zero_share(rates))
            + (1.0 - weight) * zero_share(role_rates);
        if zeros > NOT_IN_KIT {
            return None;
        }

        let in_role = rank(role_rates, rate);
        let blended = match hero_rates {
            Some(hero_rates) => {
                let offset = self.kit_offsets.get(&(hero_id, stat)).copied();
                let in_role = (in_role - offset.unwrap_or(0.0)).clamp(0.0, 1.0);
                weight * rank(hero_rates, rate) + (1.0 - weight) * in_role
            }
            None => in_role,
        };

        Some(if lower_is_better(stat) {
            1.0 - blended
        } else {
            blended
        })
    }
}

/// How much `samples` of the hero's games weigh against the role's.
pub fn hero_weight(samples: usize) -> f64 {
    let samples = samples as f64;
    samples / (samples + BLEND_SAMPLES)
}

/// The share of `sorted` under the rate, ties counting half so a rate everyone
/// shares sits in the middle.
fn rank(sorted: &[f64], rate: f64) -> f64 {
    let below = sorted.partition_point(|&r| r < rate);
    let up_to = sorted.partition_point(|&r| r <= rate);

    (below + up_to) as f64 / (2 * sorted.len()) as f64
}

fn zero_share(sorted: &[f64]) -> f64 {
    sorted.partition_point(|&r| r <= 0.0) as f64 / sorted.len() as f64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::role_performances::RoleStat::{Healing, HeroDamage};

    const JAINA: i64 = 2;
    const ROLE: HeroRole = HeroRole::RangedAssassin;

    fn peers() -> Baseline {
        Baseline::empty(Gate::RoleSamples(MIN_PEER_SAMPLES))
    }

    /// The owner's games on Jaina, one a hero damage rate.
    fn own(rates: &[f64]) -> Baseline {
        let games: Vec<_> = rates
            .iter()
            .map(|&rate| {
                vec![PlayerGame {
                    hero_id: JAINA,
                    hero_role: Some(ROLE),
                    duration: 60,
                    hero_damage: Some(rate as i64),
                    is_owner: true,
                    ..Default::default()
                }]
            })
            .collect();
        let totals: Vec<_> = games
            .iter()
            .map(|game| super::super::game_totals(game))
            .collect();

        Baseline::own(games.iter().map(Vec::as_slice).zip(&totals), &[HeroDamage])
    }

    #[test]
    fn ties_rank_in_the_middle() {
        assert_eq!(rank(&[1.0, 2.0, 2.0, 3.0], 2.0), 0.5);
        assert_eq!(rank(&[5.0], 5.0), 0.5);
        assert_eq!(rank(&[5.0], 6.0), 1.0);
        assert_eq!(rank(&[5.0], 4.0), 0.0);
    }

    #[test]
    fn few_same_hero_samples_lean_on_the_role() {
        let mut baseline = peers();
        baseline
            .roles
            .insert((ROLE, HeroDamage), (1..=40).map(f64::from).collect());

        let unseen = baseline.percentile(JAINA, ROLE, HeroDamage, 10.5);
        assert_eq!(unseen, Some(0.25));

        // As many samples as the blend's own count weigh half.
        baseline
            .heroes
            .insert((JAINA, HeroDamage), vec![1.0; BLEND_SAMPLES as usize]);
        let seen = baseline.percentile(JAINA, ROLE, HeroDamage, 10.5);
        assert_eq!(seen, Some(0.5 * 1.0 + 0.5 * 0.25));
    }

    #[test]
    fn a_kit_above_its_role_is_pulled_back() {
        let mut baseline = peers();
        baseline
            .roles
            .insert((ROLE, HeroDamage), (1..=40).map(f64::from).collect());
        baseline
            .heroes
            .insert((JAINA, HeroDamage), (31..=40).map(f64::from).collect());
        baseline.hero_roles.insert(JAINA, ROLE);
        baseline.sort();
        baseline.offset_kits();

        // Jaina's samples rank 0.875 in the role on average, trusted 10 / 15, so her
        // rank in the role is shifted down by 0.25. Her median player ranks 0.5 among
        // Jainas and 0.875 in the role, weighing 10 / 40 and 30 / 40.
        let median = baseline.percentile(JAINA, ROLE, HeroDamage, 35.5).unwrap();
        let expected = 0.25 * 0.5 + 0.75 * (0.875 - 0.25);
        assert!((median - expected).abs() < 1e-9, "{median}");
    }

    #[test]
    fn a_thin_role_ranks_nothing() {
        let mut baseline = peers();
        let rates = (1..MIN_PEER_SAMPLES).map(|r| r as f64).collect();
        baseline.roles.insert((ROLE, HeroDamage), rates);

        assert_eq!(baseline.percentile(JAINA, ROLE, HeroDamage, 10.0), None);
    }

    #[test]
    fn a_stat_outside_the_kit_goes_unscored() {
        let mut baseline = peers();
        let mostly_zero = (0..40).map(|i| if i < 35 { 0.0 } else { 100.0 }).collect();
        baseline.roles.insert((ROLE, Healing), mostly_zero);

        assert_eq!(baseline.percentile(JAINA, ROLE, Healing, 50.0), None);

        // A hero whose players do heal outweighs the role.
        baseline
            .heroes
            .insert((JAINA, Healing), vec![100.0; 4 * BLEND_SAMPLES as usize]);
        assert!(baseline.percentile(JAINA, ROLE, Healing, 50.0).is_some());
    }

    #[test]
    fn peers_leave_out_the_owner_and_ai() {
        let game: Vec<_> = [(true, false), (false, true), (false, false)]
            .into_iter()
            .map(|(is_owner, is_ai)| PlayerGame {
                hero_id: JAINA,
                hero_role: Some(ROLE),
                is_owner,
                is_ai,
                ..Default::default()
            })
            .collect();
        let totals = super::super::game_totals(&game);

        let baseline = Baseline::peers([(&game[..], &totals)], &[HeroDamage]);
        assert_eq!((baseline.players(), baseline.hero_games(JAINA)), (1, 1));
    }

    #[test]
    fn the_owners_usual_needs_enough_games_in_the_role() {
        let rates: Vec<_> = (1..MIN_OWN_GAMES as i64).map(|r| r as f64).collect();
        assert_eq!(own(&rates).percentile(JAINA, ROLE, HeroDamage, 5.0), None);

        let rates: Vec<_> = (1..=MIN_OWN_GAMES as i64).map(|r| r as f64).collect();
        let median = own(&rates).percentile(JAINA, ROLE, HeroDamage, 5.5);
        assert_eq!(median, Some(0.5));
    }
}
