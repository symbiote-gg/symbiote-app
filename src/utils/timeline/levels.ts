import type { TimelineEvent } from "@/api/replays";

const TALENT_TIERS = [4, 7, 10, 13, 16, 20];

export type LevelCurve = [number, number][];

export function levelCurves(
    events: TimelineEvent[],
    allyTeam: number,
): [LevelCurve, LevelCurve] {
    const curve = (team: number): LevelCurve => [
        [0, 1],
        ...events
            .filter(
                (e) => e.kind === "team_level" && e.team === team && e.time > 0,
            )
            .map((e): [number, number] => [e.time, e.data.level as number]),
    ];

    return [curve(allyTeam), curve(1 - allyTeam)];
}

/** Fractional level: progress towards the next level-up is linear in time. */
export function levelAt(curve: LevelCurve, time: number) {
    for (let i = curve.length - 1; i >= 0; i--) {
        const [start, level] = curve[i];
        if (time < start) continue;

        const next = curve[i + 1];
        if (!next) return level;

        return level + ((time - start) / (next[0] - start)) * (next[1] - level);
    }

    return 1;
}

export function leadAt(curves: [LevelCurve, LevelCurve], time: number) {
    return levelAt(curves[0], time) - levelAt(curves[1], time);
}

/** Points of the ally-minus-enemy level lead; linear between them. */
export function leadPoints(
    curves: [LevelCurve, LevelCurve],
    duration: number,
): [number, number][] {
    const times = [
        ...new Set([...curves[0], ...curves[1], [duration]].map((p) => p[0])),
    ]
        .filter((time) => time <= duration)
        .sort((a, b) => a - b);
    return times.map((time) => [time, leadAt(curves, time)]);
}

export interface TierReached {
    level: number;
    side: "ally" | "enemy";
    time: number;
    secondsAhead: number;
}

const reachedAt = (curve: LevelCurve, level: number) =>
    curve.find(([, l]) => l >= level)?.[0];

export function tiersReached(
    curves: [LevelCurve, LevelCurve],
    duration: number,
) {
    return (["ally", "enemy"] as const).flatMap((side, team) =>
        TALENT_TIERS.flatMap((level): TierReached[] => {
            const time = reachedAt(curves[team], level);
            if (time === undefined) return [];

            const other = reachedAt(curves[1 - team], level) ?? duration;

            return [
                { level, side, time, secondsAhead: Math.round(other - time) },
            ];
        }),
    );
}
