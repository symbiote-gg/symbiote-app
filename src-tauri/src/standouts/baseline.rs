//! Pools the owner's recent games on a hero into their usual: the yardstick the
//! current game is judged against.

use super::metrics::GameMetrics;

/// Fewest games that say anything about the player's usual on a hero.
pub const MIN_BASELINE_GAMES: usize = 5;

/// The owner's usual on a hero, as pooled rates. A rate is `None` when its
/// pooled base is zero, and the rule it feeds falls back to its absolute form.
#[derive(Debug)]
pub struct HeroBaseline {
    pub alone_rate: Option<f64>,
    pub alone_near_rate: Option<f64>,
    pub pick_rate: Option<f64>,
    pub first_dead_rate: Option<f64>,
    pub unanswered_rate: Option<f64>,
    pub avg_stay: Option<f64>,
    pub punished_rate: Option<f64>,
    pub time_dead_share: Option<f64>,
    pub miss_rate: Option<f64>,
    pub stolen_per_game: f64,
    pub structures_per_game: f64,
    pub soak_per_min: Option<f64>,
}

/// Pools the games into rates, sums over sums, so a short game doesn't weigh
/// like a long one. `None` under [`MIN_BASELINE_GAMES`] games.
pub fn aggregate(games: &[(GameMetrics, f64)]) -> Option<HeroBaseline> {
    if games.len() < MIN_BASELINE_GAMES {
        return None;
    }

    let sum =
        |pick: &dyn Fn(&GameMetrics) -> f64| -> f64 { games.iter().map(|(m, _)| pick(m)).sum() };
    let rate = |num: f64, den: f64| (den > 0.0).then_some(num / den);

    let owner_deaths = sum(&|m| m.owner_deaths as f64);
    let fight_total = sum(&|m| m.fights.total as f64);
    let stay_count = sum(&|m| m.stays.count as f64);

    // Only games that know the stat weigh into its pooled denominator.
    let mut dead = 0.0;
    let mut dead_duration = 0.0;
    let mut soak = 0.0;
    let mut soak_duration = 0.0;
    for (m, duration) in games {
        if let Some(time_dead) = m.time_dead {
            dead += time_dead;
            dead_duration += duration;
        }
        if let Some(game_soak) = m.lane.soak {
            soak += game_soak;
            soak_duration += duration;
        }
    }

    Some(HeroBaseline {
        alone_rate: rate(
            sum(&|m| m.alone.count as f64),
            sum(&|m| m.alone.known as f64),
        ),
        alone_near_rate: rate(
            sum(&|m| m.alone_near.count as f64),
            sum(&|m| m.alone_near.known as f64),
        ),
        pick_rate: rate(sum(&|m| m.picks.count as f64), owner_deaths),
        first_dead_rate: rate(
            sum(&|m| m.first_dead.count as f64),
            sum(&|m| m.first_dead.multi_death_fights as f64),
        ),
        unanswered_rate: rate(
            sum(&|m| m.unanswered.count as f64),
            sum(&|m| m.unanswered.fight_deaths as f64),
        ),
        avg_stay: rate(
            sum(&|m| m.stays.avg_stay * m.stays.count as f64),
            stay_count,
        ),
        punished_rate: rate(sum(&|m| m.punished.count as f64), owner_deaths),
        time_dead_share: rate(dead, dead_duration),
        miss_rate: rate(sum(&|m| m.fights.missed as f64), fight_total),
        stolen_per_game: sum(&|m| m.stolen_camps.count as f64) / games.len() as f64,
        structures_per_game: sum(&|m| m.lane.structures as f64) / games.len() as f64,
        soak_per_min: rate(soak, soak_duration / 60.0),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::standouts::metrics;

    #[test]
    fn needs_enough_games() {
        let games: Vec<_> = (0..5).map(|_| (metrics::empty(), 600.0)).collect();
        assert!(aggregate(&games[..4]).is_none());
        assert!(aggregate(&games).is_some());
    }

    #[test]
    fn pools_rates_over_all_games_not_per_game_averages() {
        let mut games: Vec<_> = (0..5).map(|_| (metrics::empty(), 600.0)).collect();
        // One death, a pick, in one game; nine clean deaths in another: pooled
        // 1 in 10, not the 50% a per-game average would claim.
        games[0].0.owner_deaths = 1;
        games[0].0.picks.count = 1;
        games[1].0.owner_deaths = 9;

        // Stays pool by their total seconds: (2 * 10s + 3 * 20s) / 5.
        games[0].0.stays.count = 2;
        games[0].0.stays.avg_stay = 10.0;
        games[1].0.stays.count = 3;
        games[1].0.stays.avg_stay = 20.0;

        // Time dead pools only over the games that know it.
        games[0].0.time_dead = Some(60.0);
        games[1].0.time_dead = Some(120.0);

        // Soak pools XP over the minutes of the games that carry a breakdown.
        games[0].0.lane.soak = Some(300.0);
        games[1].0.lane.soak = Some(900.0);
        games[2].0.lane.structures = 1;

        games[3].0.stolen_camps.count = 2;
        games[0].0.punished.count = 1;

        let usual = aggregate(&games).unwrap();
        assert_eq!(usual.pick_rate, Some(0.1));
        assert_eq!(usual.avg_stay, Some(16.0));
        assert_eq!(usual.time_dead_share, Some(180.0 / 1200.0));
        assert_eq!(usual.soak_per_min, Some(1200.0 / 20.0));
        assert_eq!(usual.structures_per_game, 0.2);
        assert_eq!(usual.stolen_per_game, 0.4);
        assert_eq!(usual.punished_rate, Some(0.1));
    }

    #[test]
    fn leaves_rates_with_no_base_unknown() {
        let games: Vec<_> = (0..5).map(|_| (metrics::empty(), 600.0)).collect();
        let usual = aggregate(&games).unwrap();
        assert_eq!(usual.alone_rate, None);
        assert_eq!(usual.pick_rate, None);
        assert_eq!(usual.miss_rate, None);
        assert_eq!(usual.time_dead_share, None);
        assert_eq!(usual.soak_per_min, None);
        assert_eq!(usual.stolen_per_game, 0.0);
    }
}
