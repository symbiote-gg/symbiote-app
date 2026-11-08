import dayjs, { type Dayjs } from "dayjs";

import type { TrendPoint } from "@/api/heroes";

export const TREND_DAYS = 90;

export type Day = {
    day: Dayjs;
    games: number;
    wins: number;
    losses: number;
    rate: number | null;
    /** The rate carried over from the last rated day, matching the line's value here. */
    carried: number | null;
};

export function fillDays(points: TrendPoint[]): Day[] {
    const last = points[points.length - 1];
    if (!last) return [];

    const byDay = new Map(points.map((point) => [point.day, point]));
    const end = dayjs(last.day);

    let carried: number | null = null;

    return Array.from({ length: TREND_DAYS }, (_, index) => {
        const day = end.subtract(TREND_DAYS - 1 - index, "day");
        const point = byDay.get(day.format("YYYY-MM-DD"));

        carried = point?.rate ?? carried;

        return {
            day,
            games: point?.games ?? 0,
            wins: point?.wins ?? 0,
            losses: point?.losses ?? 0,
            rate: point?.rate ?? null,
            carried,
        };
    });
}

export type RateDomain = {
    low: number;
    high: number;
    ticks: number[];
};

// Rounding guards against float steps like 0.7 * 10 = 7.000000000000001.
const EPSILON = 1e-9;

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
 * between two days never shows a rate neither had (monotone cubic).
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
