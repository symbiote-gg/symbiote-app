import type { Timeline } from "@/api/replays";

export type MilestoneKind = "firstBlood" | "firstFort" | "firstTen";

export interface Milestone {
    kind: MilestoneKind;
    team: number;
    time: number;
}

const opponent = (team: number | null) => (team === null ? null : 1 - team);

function reachedAt(levels: [number, number][], level: number) {
    return levels.find(([, reached]) => reached >= level)?.[0] ?? null;
}

function firstTo(timeline: Timeline, level: number) {
    const times = timeline.levels.map((levels) => reachedAt(levels, level));
    const reached = times.flatMap((time, team) =>
        time === null ? [] : [{ team, time }],
    );
    if (reached.length === 0) return null;

    return reached.reduce((first, next) =>
        next.time < first.time ? next : first,
    );
}

export function milestones(timeline: Timeline): Milestone[] {
    const blood = timeline.deaths[0];
    const fort = timeline.structures.find((structure) => !structure.keep);
    const ten = firstTo(timeline, 10);

    const candidates = [
        {
            kind: "firstBlood",
            team: opponent(blood?.team ?? null),
            time: blood?.time,
        },
        {
            kind: "firstFort",
            team: opponent(fort?.team ?? null),
            time: fort?.time,
        },
        { kind: "firstTen", team: ten?.team ?? null, time: ten?.time },
    ] as const;

    return candidates.flatMap(({ kind, team, time }) =>
        team === null || time === undefined ? [] : [{ kind, team, time }],
    );
}
