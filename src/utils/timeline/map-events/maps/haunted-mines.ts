import type { TimelineEvent } from "@/api/replays";
import { fixed, label } from "../data";
import type { MapEventData, MapEventSpec } from "../types";

/** Both teams' golems rise together, one event each. */
const golemSpawn = (event: TimelineEvent, events: TimelineEvent[]) =>
    events.filter(
        (other) => other.kind === event.kind && other.time === event.time,
    );

const skulls = (event: TimelineEvent) =>
    fixed(event.data as MapEventData, "SkullCount") ?? 0;

export const HAUNTED_MINES: Record<string, MapEventSpec> = {
    haunted_mines_golems_spawned: {
        role: "objective",
        glyph: "golem",
        label: label("golem"),
        /** One entry per spawn, owned by the stronger golem. */
        when: (event, events) =>
            golemSpawn(event, events).reduce((best, other) =>
                skulls(other) > skulls(best) ? other : best,
            ) === event,
        race: (_, event, events) => {
            const teamValues: [number, number] = [0, 0];
            for (const other of golemSpawn(event, events)) {
                if (other.team !== null) teamValues[other.team] = skulls(other);
            }
            return { kind: "golem", teamValues };
        },
    },
    golem_lanes: { role: "ignore", glyph: "golem", label: label("golem") },
};
