export const TRACK_HEIGHT = 420;
export const AXIS = TRACK_HEIGHT / 2;
export const TICK_Y = 11;
/** Camps sit off the axis, just inside the kill band. */
export const CAMP_Y = 22;

/**
 * Distance from the axis; bands are 32px apart so their marks don't overlap.
 * Kills share the fight band, stepping out alongside fights.
 */
export const BANDS = {
    kill: { y: 42, height: 22 },
    fight: { y: 42, height: 26 },
    boss: { y: 74, height: 26 },
    fort: { y: 106, height: 26 },
    keep: { y: 138, height: 32 },
    objective: { y: 170, height: 28 },
} as const;
