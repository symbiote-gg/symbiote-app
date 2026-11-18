import type { HeroScoreRow } from "@/api/stats";
import { TIERS, tierIndex, tierRange } from "../score-card/tiers";

// Under this many games a hero draws as a small grey dot.
export const MIN_GAMES = 5;

export const DOT = 28;
export const SMALL_DOT = 14;
export const GAP = 4;
export const PITCH = DOT + GAP;

// The score over time chart's height. A taller pile grows past it.
export const MIN_HEIGHT = 264;

// Matches the bars' gap-x-1.5, which is the score card ladder's.
const TIER_GAP = 6;

// Room past the outer cuts, so the open ends still show a stretch of their column.
const PAD = 5;
const TOP = 100;

export const isMain = (hero: HeroScoreRow) => hero.games >= MIN_GAMES;

/** Where the outer, open ended ratings start and end on the axis. */
export function axis(scores: number[]) {
    return {
        low: Math.max(0, Math.min(TIERS[1].from, ...scores) - PAD),
        high: Math.min(
            TOP,
            Math.max(TIERS[TIERS.length - 1].from, ...scores) + PAD,
        ),
    };
}

/**
 * Each rating takes an equal column, as on the score card ladder, and a score
 * sits within its rating's column by how far into the range it is.
 */
export function position(
    score: number,
    width: number,
    { low, high }: ReturnType<typeof axis>,
) {
    const index = tierIndex(score);
    const range = tierRange(index);
    const min = index === 0 ? low : range.min;
    const max = index === TIERS.length - 1 ? high : range.max;
    const share = Math.min(1, Math.max(0, (score - min) / (max - min)));

    const column = (width - TIER_GAP * (TIERS.length - 1)) / TIERS.length;

    return index * (column + TIER_GAP) + share * column;
}

export interface Placed {
    hero: HeroScoreRow;
    left: number;
    row: number;
    size: number;
    main: boolean;
}

/**
 * Stacks the dots up from the axis: each takes the lowest row where it clears
 * the dots already there. Heroes with more games go first, so they sit lowest.
 */
export function swarm(
    heroes: HeroScoreRow[],
    width: number,
    x: (score: number) => number,
) {
    const order = [...heroes].sort(
        (a, b) => b.games - a.games || a.name.localeCompare(b.name),
    );
    const rows: Placed[][] = [];

    const placed = order.map((hero) => {
        const main = isMain(hero);
        const size = main ? DOT : SMALL_DOT;
        const half = size / 2;
        const centre = Math.min(width - half, Math.max(half, x(hero.score)));

        const clears = (dot: Placed) =>
            Math.abs(dot.left - centre) >= (dot.size + size) / 2 + GAP;

        let row = rows.findIndex((dots) => dots.every(clears));
        if (row === -1) {
            row = rows.length;
            rows.push([]);
        }

        const dot = { hero, left: centre, row, size, main };
        rows[row].push(dot);

        return dot;
    });

    return { placed, rows: rows.length };
}
