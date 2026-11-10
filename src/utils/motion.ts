// Mirrors the motion tokens in `index.css`: `motion` takes no easing or
// duration from a CSS variable.
export const EASE_SETTLE_CURVE = [0.2, 0.7, 0.2, 1] as const;
export const ENTER_MS = 250;
export const TRAVEL_MS = 450;
export const REVEAL_MS = 900;
export const STAGGER_MS = 40;

export const EASE_SWEEP_CURVE = [0.25, 0.1, 0.25, 1] as const;

export interface Stagger {
    gapMs: number;
    steps: number;
}

export const CARD_STAGGER: Stagger = { gapMs: 2 * STAGGER_MS, steps: 6 };
export const ROW_STAGGER: Stagger = { gapMs: 2 * STAGGER_MS, steps: 4 };

const BATCH_MS = 50;

let lastMount = -Infinity;
let step = 0;

/** The delay for an item mounting now, one stagger later than the last if it's close. */
export function nextStagger({ gapMs, steps }: Stagger): number {
    const now = performance.now();
    step = now - lastMount < BATCH_MS ? Math.min(step + 1, steps) : 0;
    lastMount = now;

    return step * gapMs;
}

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export const reducedMotion = () => matchMedia(REDUCED_MOTION).matches;
