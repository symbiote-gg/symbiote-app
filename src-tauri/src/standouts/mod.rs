//! Coaching standouts: conclusions about the owner's game, judged against their
//! recent games on the same hero. Computed here so the frontend only renders.

mod baseline;
mod metrics;
mod rules;

use crate::types::hero::HeroRole;
use crate::types::standouts::StandoutsResult;
use crate::types::timeline::{Timeline, XpBreakdown};

/// Heroes whose job is pushing lanes over joining fights: a hand-kept list, as
/// the role data doesn't say.
const PUSH_HEROES: [&str; 10] = [
    "Abathur",
    "Azmodan",
    "Dehaka",
    "LostVikings",
    "Murky",
    "Necromancer",
    "Sylvanas",
    "Tinker",
    "WitchDoctor",
    "Zagara",
];

/// Heroes whose deaths cost only seconds: Murky's respawn is a blink, and a lone
/// Viking down leaves two still playing. Their time dead says nothing.
const CHEAP_DEATH_HEROES: [&str; 2] = ["LostVikings", "Murky"];

/// One game's raw data, as the metrics read it.
pub struct GameData {
    /// Seconds.
    pub duration: f64,
    pub owner_slot: u8,
    pub ally_team: u8,
    pub owner_time_dead: Option<f64>,
    pub owner_xp: Option<XpBreakdown>,
    pub timeline: Timeline,
}

pub struct StandoutsInput {
    pub hero_slug: String,
    pub hero_role: Option<HeroRole>,
    pub current: GameData,
    /// The owner's recent games on the same hero, newest first.
    pub baseline: Vec<GameData>,
}

pub fn compute(input: &StandoutsInput) -> StandoutsResult {
    let game = |g: &GameData| {
        metrics::game_metrics(
            &g.timeline,
            g.duration,
            g.owner_slot,
            g.ally_team,
            g.owner_time_dead,
            g.owner_xp.as_ref(),
        )
    };
    let games: Vec<_> = input
        .baseline
        .iter()
        .map(|g| (game(g), g.duration))
        .collect();
    let usual = baseline::aggregate(&games);
    let ctx = rules::RuleContext {
        role: input.hero_role,
        push: PUSH_HEROES.contains(&input.hero_slug.as_str()),
        abathur: input.hero_slug == "Abathur",
        cheap_deaths: CHEAP_DEATH_HEROES.contains(&input.hero_slug.as_str()),
        baseline: usual.as_ref(),
    };
    StandoutsResult {
        items: rules::evaluate(&game(&input.current), &ctx),
        events_expired: false,
    }
}
