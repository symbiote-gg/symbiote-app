import type { TimelineEvent } from "@/api/replays";
import type { MapEventData, ObjectiveLabel, Race } from "./types";

export const int = (data: MapEventData, key: string) => data.ints?.[key];
export const fixed = (data: MapEventData, key: string) => data.fixed?.[key];

/** Map-event ints count teams from 1. */
export function intTeam(data: MapEventData, key: string) {
    const raw = int(data, key);
    return raw === 1 ? 0 : raw === 2 ? 1 : null;
}

export const fromInt = (key: string) => (data: MapEventData) =>
    intTeam(data, key);

export const label = (value: ObjectiveLabel) => () => value;

export const pair = (data: MapEventData, won: string, lost: string) => {
    const a = int(data, won);
    const b = int(data, lost);
    return a === undefined || b === undefined
        ? undefined
        : ([a, b] as [number, number]);
};

/** Reorders a winner-first pair by team. */
export const byTeam = (winner: number, [won, lost]: [number, number]) =>
    (winner === 0 ? [won, lost] : [lost, won]) as [number, number];

export const scoreRace =
    (kind: Race["kind"]) =>
    (data: MapEventData, event: TimelineEvent): Race | null => {
        const score = pair(data, "TeamScore", "OpponentScore");
        return event.team === null || !score
            ? null
            : {
                  kind,
                  teamValues: byTeam(event.team, score),
                  topTeam: event.team,
              };
    };

/** Kills of `kind` events within `[start, end]` crediting `slot`. */
export const credited = (
    events: TimelineEvent[],
    kind: string,
    slot: number,
    start: number,
    end: number | null,
) =>
    events.filter(
        (other) =>
            other.kind === kind &&
            other.time >= start &&
            (end === null || other.time <= end) &&
            ((other.data.killers as number[] | undefined) ?? []).includes(slot),
    ).length;
