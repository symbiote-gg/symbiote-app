import type { TimelineEvent } from "@/api/replays";
import { intTeam } from "./data";
import * as maps from "./maps";
import type { MapEventData, MapEventSpec } from "./types";

export * from "./types";
export { intTeam } from "./data";

export const MAP_EVENTS: Record<string, MapEventSpec> = Object.assign(
    {},
    ...Object.values(maps),
);

export const specGlyph = (spec: MapEventSpec, data: MapEventData) =>
    spec.glyphFor?.(data) ?? spec.glyph;

/** Side of an event no table entry knows: its team, else any ints key naming a team. */
export function unknownTeam(event: TimelineEvent) {
    if (event.team !== null) return event.team;

    const data = event.data as MapEventData;
    const key = Object.keys(data.ints ?? {}).find((k) => /team/i.test(k));

    return key ? intTeam(data, key) : null;
}

export function humanize(kind: string) {
    const words = kind.replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}
