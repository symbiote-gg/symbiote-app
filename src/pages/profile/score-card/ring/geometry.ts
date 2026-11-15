export const CENTER = 300;

// Degrees clockwise from 12 o'clock: the rings leave a gap centred at the bottom.
const SWEEP = { from: 210, span: 300 };

// A shorter arc is left undrawn.
const MIN_ARC = 0.05;

export const NO_PATH = "M0,0";

export const fixed = (value: number) => Math.round(value * 100) / 100;

export function point(radius: number, degrees: number) {
    const angle = (degrees * Math.PI) / 180;

    return [
        fixed(CENTER + radius * Math.sin(angle)),
        fixed(CENTER - radius * Math.cos(angle)),
    ];
}

/** The angle `share` of the sweep ends at, from 0 to 1. */
export const sweepAngle = (share: number) =>
    SWEEP.from + SWEEP.span * Math.min(1, Math.max(0, share));

export function arc(radius: number, from: number, to: number) {
    if (to - from < MIN_ARC) return NO_PATH;

    const large = to - from > 180 ? 1 : 0;

    return `M${point(radius, from)} A${radius},${radius} 0 ${large} 1 ${point(radius, to)}`;
}

/**
 * Where each column of the score stands, in digits, the ones first. The ones turn
 * with the score and a column above only rolls while the one under it passes 9.
 */
export function odometer(value: number) {
    const ones = value % 10;
    const carry = Math.max(0, ones - 9);
    const tens = Math.floor(value / 10) % 10;

    return [
        ones,
        tens + carry,
        Math.floor(value / 100) + (tens === 9 ? carry : 0),
    ];
}

/** How many columns the score fills, one rolling in counting already. */
export const digitCount = (value: number) =>
    String(Math.max(0, Math.ceil(value))).length;
