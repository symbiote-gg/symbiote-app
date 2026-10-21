import type { TimelineEvent } from "@/api/replays";
import { fixed, int, label } from "../data";
import type { MapEventData, MapEventSpec } from "../types";

/** Sky Temple activation phase, counted from 1. */
const phase = (event: TimelineEvent) =>
    int(event.data as MapEventData, "Event");

export const SKY_TEMPLE: Record<string, MapEventSpec> = {
    sky_temple_captured: {
        role: "objective",
        glyph: "temple",
        label: label("temple"),
        /** Temples flip on every recapture; keep a team's first per phase. */
        when: (event, events) =>
            event.team !== null &&
            events.find(
                (other) =>
                    other.kind === event.kind &&
                    other.team === event.team &&
                    phase(other) === phase(event),
            ) === event,
        race: (_, event, events) => {
            if (event.team === null) return null;
            const values: [number, number] = [0, 0];
            for (const other of events) {
                if (
                    other.kind !== "sky_temple_shots_fired" ||
                    other.team === null ||
                    phase(other) !== phase(event)
                ) {
                    continue;
                }
                values[other.team] +=
                    fixed(other.data as MapEventData, "SkyTempleShotsDamage") ??
                    0;
            }
            return {
                kind: "temple",
                teamValues: [Math.round(values[0]), Math.round(values[1])],
                topTeam: event.team,
            };
        },
    },
    sky_temple_activated: {
        role: "ignore",
        glyph: "temple",
        label: label("temple"),
    },
    sky_temple_shots_fired: {
        role: "ignore",
        glyph: "temple",
        label: label("temple"),
    },
};
