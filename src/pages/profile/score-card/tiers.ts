import type { CSSProperties } from "react";

export type ScoreTier =
    | "exceptional"
    | "standout"
    | "aboveAverage"
    | "average"
    | "belowAverage"
    | "wellBelowAverage";

export type ScoreRank =
    "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

const TOP = 100;

// Cut on averages over many games, which sit much closer to 50 than single games.
// Measured on 2026-11-13 over the 16 players met in 10+ games of the replays: a
// tenth of them averaged under 40, a tenth over 60, the middle half 44 to 52.
// Exceptional sits well past that spread so it stays rare.
export const TIERS: { from: number; tier: ScoreTier; rank: ScoreRank }[] = [
    { from: 0, tier: "wellBelowAverage", rank: "bronze" },
    { from: 40, tier: "belowAverage", rank: "silver" },
    { from: 47, tier: "average", rank: "gold" },
    { from: 55, tier: "aboveAverage", rank: "platinum" },
    { from: 62, tier: "standout", rank: "diamond" },
    { from: 70, tier: "exceptional", rank: "master" },
];

export function tierIndex(score: number) {
    const above = TIERS.findIndex(({ from }) => score < from);

    return (above === -1 ? TIERS.length : Math.max(1, above)) - 1;
}

export function tierRange(index: number) {
    return { min: TIERS[index].from, max: TIERS[index + 1]?.from ?? TOP };
}

export type TierBounds =
    | { kind: "under"; max: number }
    | { kind: "between"; min: number; max: number }
    | { kind: "over"; min: number };

/** The tier's range as written on the ladder, both ends included. */
export function tierBounds(index: number): TierBounds {
    const { min, max } = tierRange(index);

    if (index === 0) return { kind: "under", max };
    if (index === TIERS.length - 1) return { kind: "over", min };
    return { kind: "between", min, max: max - 1 };
}

export type TierProgress = {
    tier: ScoreTier;
    /** `null` in the top tier. */
    next: { tier: ScoreTier; points: number } | null;
};

export function tierProgress(score: number): TierProgress {
    const index = tierIndex(score);
    const { max } = tierRange(index);
    const above = TIERS[index + 1];

    return {
        tier: TIERS[index].tier,
        next: above ? { tier: above.tier, points: max - score } : null,
    };
}

/** The rank's colours, as `--rank` and `--rank-text`. */
export const rankTone = (rank: ScoreRank) =>
    ({
        "--rank": `var(--color-rank-${rank})`,
        "--rank-text": `var(--color-rank-${rank}-text)`,
    }) as CSSProperties;
