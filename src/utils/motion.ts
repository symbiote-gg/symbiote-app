// Mirrors the motion tokens in `index.css`: the Web Animations API takes neither
// an easing nor a duration from a CSS variable.
export const EASE_SETTLE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
export const ENTER_MS = 250;
export const TRAVEL_MS = 450;
export const STAGGER_MS = 40;

const STAGGER_STEPS = 8;
const BATCH_MS = 50;

let lastMount = -Infinity;
let step = 0;

/** The delay for an item mounting now, one stagger later than the last if it's close. */
export function nextStagger(): number {
    const now = performance.now();
    step = now - lastMount < BATCH_MS ? Math.min(step + 1, STAGGER_STEPS) : 0;
    lastMount = now;

    return step * STAGGER_MS;
}

export const reducedMotion = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;
