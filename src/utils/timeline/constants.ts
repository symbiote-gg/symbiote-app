export const TRACK_HEIGHT = 420;
export const AXIS = TRACK_HEIGHT / 2;
export const TICK_Y = 11;
export const AXIS_GAP = 1;
export const CAMP_Y = 22;

export const BANDS = {
    kill: { y: 46, height: 22 },
    fight: { y: 46, height: 26 },
    boss: { y: 74, height: 26 },
    fort: { y: 106, height: 26 },
    keep: { y: 138, height: 32 },
    objective: { y: 170, height: 28 },
} as const;
