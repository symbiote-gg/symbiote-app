import dayjs, { type Dayjs } from "dayjs";

import type { HeroTrend } from "@/api/heroes";

export type Bucket = {
    start: Dayjs;
    games: number;
    wins: number;
    losses: number;
};

export function fillBuckets({ bucket, points }: HeroTrend): Bucket[] {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return [];

    const byStart = new Map(points.map((point) => [point.start, point]));
    const end = dayjs(last.start);
    const buckets: Bucket[] = [];

    for (
        let start = dayjs(first.start);
        !start.isAfter(end);
        start = start.add(1, bucket)
    ) {
        const point = byStart.get(start.format("YYYY-MM-DD"));
        buckets.push({
            start,
            games: point?.games ?? 0,
            wins: point?.wins ?? 0,
            losses: point?.losses ?? 0,
        });
    }

    return buckets;
}

export type RateDomain = {
    low: number;
    high: number;
    /** Every 10% from `low` to `high`. */
    ticks: number[];
};

// Rounding guards against float steps like 0.7 * 10 = 7.000000000000001.
const EPSILON = 1e-9;

/**
 * Zooms the rate axis to the rates, at 10% steps, always keeping at least 40% to 60%
 * so 50% stays on it and a steady line doesn't look like a swing.
 */
export function rateDomain(rates: number[]): RateDomain {
    const low = Math.min(
        4,
        ...rates.map((rate) => Math.floor(rate * 10 + EPSILON)),
    );
    const high = Math.max(
        6,
        ...rates.map((rate) => Math.ceil(rate * 10 - EPSILON)),
    );
    const ticks = Array.from(
        { length: high - low + 1 },
        (_, index) => (low + index) / 10,
    );

    return { low: low / 10, high: high / 10, ticks };
}

export type Point = { x: number; y: number };

/**
 * A smooth path through the points that never overshoots them, so a curve
 * between two months never shows a rate neither had (monotone cubic).
 */
export function curve(points: Point[]) {
    const slopes = points.slice(1).map((point, index) => {
        const prev = points[index];
        return (point.y - prev.y) / (point.x - prev.x);
    });

    const tangents = points.map((_, index) => {
        if (index === 0) return slopes[0];
        if (index === points.length - 1) return slopes[index - 1];

        const before = slopes[index - 1];
        const after = slopes[index];
        if (before * after <= 0) return 0;

        // Points are evenly spaced, so the harmonic mean of the two slopes
        // keeps the curve monotone (Fritsch-Carlson).
        return 2 / (1 / before + 1 / after);
    });

    const [first, ...rest] = points;
    const segments = rest.map((point, index) => {
        const prev = points[index];
        const third = (point.x - prev.x) / 3;

        return (
            `C${prev.x + third},${prev.y + tangents[index] * third} ` +
            `${point.x - third},${point.y - tangents[index + 1] * third} ` +
            `${point.x},${point.y}`
        );
    });

    return `M${first.x},${first.y} ${segments.join(" ")}`;
}
