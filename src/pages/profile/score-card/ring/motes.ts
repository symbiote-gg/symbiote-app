import { CENTER } from "./geometry";

const MOTES = {
    count: 18,
    /** Seconds. */
    life: { min: 3, max: 6 },
    /** Units a second, upwards. */
    rise: { min: 4, max: 9 },
    sway: { min: 2, max: 5 },
    radius: { min: 1.2, max: 2.4 },
    /** From the centre, within the core. */
    reach: 140,
    /** The core's edge: one past it is out of sight. */
    edge: 150,
};

export type Mote = {
    x: number;
    y: number;
    rise: number;
    sway: number;
    phase: number;
    size: number;
    age: number;
    life: number;
};

const between = ({ min, max }: { min: number; max: number }) =>
    min + Math.random() * (max - min);

function spawn(): Mote {
    const angle = Math.random() * Math.PI * 2;
    // The root spreads them evenly over the disc instead of crowding the centre.
    const reach = MOTES.reach * Math.sqrt(Math.random());

    return {
        x: CENTER + reach * Math.cos(angle),
        y: CENTER + reach * Math.sin(angle),
        rise: between(MOTES.rise),
        sway: between(MOTES.sway),
        phase: Math.random() * Math.PI * 2,
        size: between(MOTES.radius),
        age: 0,
        life: between(MOTES.life),
    };
}

/** Spread through their lives, so they don't all show at once. */
export function createMotes(): Mote[] {
    return Array.from({ length: MOTES.count }, () => {
        const mote = spawn();
        mote.age = Math.random() * mote.life;

        return mote;
    });
}

/**
 * Moves each up by `delta` seconds, `speed` times as fast, down when it's under 0,
 * one that dies coming back somewhere else. Their lives keep to the clock, so a
 * rush doesn't cut them all short at once.
 */
export function drift(motes: Mote[], delta: number, speed = 1) {
    motes.forEach((mote, index) => {
        mote.age += delta;
        mote.y -= mote.rise * delta * speed;

        // Leaving the core at one end, back in at the other straight across, so a
        // rush streams through and neither end empties.
        const half = Math.sqrt(MOTES.edge ** 2 - (mote.x - CENTER) ** 2);
        if (mote.y < CENTER - half) mote.y += half * 2;
        if (mote.y > CENTER + half) mote.y -= half * 2;

        if (mote.age >= mote.life) motes[index] = spawn();
    });
}

// Growing in and shrinking out: an animated opacity makes WebKitGTK hide the
// page's overlay scrollbar while it runs.
export const moteAt = (mote: Mote) => ({
    x: mote.x + mote.sway * Math.sin(mote.phase + mote.age),
    y: mote.y,
    r: mote.size * Math.sin((Math.PI * mote.age) / mote.life),
});

// A rank up sends them rushing, settling back as it wears off.
const RUSH = { secs: 1.8, speed: 20 };

/** How fast they drift with `left` seconds of a rush to go. */
export const rushSpeed = (left: number) =>
    1 + (RUSH.speed - 1) * (Math.max(0, left) / RUSH.secs) ** 1.5;

// They race up with a filling bar and sink with a draining one. `perPoint` is the
// speed added for each point a second, `settle` the seconds to catch up with a
// new pace, so a move's fast start doesn't jolt them.
const PACE = { perPoint: 0.6, settle: 0.15 };

/** What the score moving at `pace` points a second adds to their speed. */
export const paceSpeed = (pace: number) => PACE.perPoint * pace;

/** Eases the pace they move at towards the score's. */
export const followPace = (current: number, target: number, delta: number) =>
    current + (target - current) * (1 - Math.exp(-delta / PACE.settle));

export const MOTE_COUNT = MOTES.count;
export const RUSH_SECS = RUSH.secs;
