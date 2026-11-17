import dayjs, { type Dayjs } from "dayjs";

import type { ScorePoint } from "@/api/stats";

export type Range = "3m" | "6m" | "1y" | "all";

export const RECENT: readonly Range[] = ["3m", "6m", "1y"];

export type ScoreDay = {
    day: Dayjs;
    from: number;
    to: number;
    games: number;
    score: number;
    previous: number | null;
};

const time = (point: ScorePoint) => new Date(point.timestamp).getTime();

export function scoreDays(points: ScorePoint[], start: number, end: number) {
    const days: ScoreDay[] = [];
    let next = 0;
    let score: number | null = null;

    for (
        let day = dayjs(start).startOf("day");
        day.valueOf() <= end;
        day = day.add(1, "day")
    ) {
        const close = day.add(1, "day").valueOf();
        const previous = score;
        let games = 0;

        while (next < points.length && time(points[next]) < close) {
            if (time(points[next]) >= day.valueOf()) games += 1;
            score = points[next].score;
            next += 1;
        }

        if (score === null) continue;

        days.push({
            day,
            from: Math.max(day.valueOf(), start),
            to: Math.min(close, end),
            games,
            score,
            previous,
        });
    }

    return days;
}
