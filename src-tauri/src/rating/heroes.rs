//! Hand-kept hero lists, for kits the role data doesn't tell apart.

/// The Lost Vikings' slug, kept in one place: it's bound into SQL to find the Vikings'
/// slots, and the hero is special-cased for its three units.
pub const LOST_VIKINGS: &str = "LostVikings";

/// Heroes whose deaths cost only seconds: Murky's respawn is a blink, and a lone
/// Viking down leaves two still playing. Their time dead says nothing.
pub const CHEAP_DEATH_HEROES: [&str; 2] = [LOST_VIKINGS, "Murky"];

/// Heroes whose job is pushing lanes over joining fights. Standouts skip their fight
/// rules, and the profile score and replay role comparison weigh their siege up,
/// unless a hero has weights of its own.
pub const PUSHERS: [&str; 11] = [
    "Abathur",
    "Azmodan",
    LOST_VIKINGS,
    "Murky",
    "Necromancer",
    "Probius",
    "Ragnaros",
    "SgtHammer",
    "Sylvanas",
    "WitchDoctor",
    "Zagara",
];
