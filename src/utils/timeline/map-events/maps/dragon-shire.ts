import type { TimelineEvent } from "@/api/replays";
import { credited, int, label } from "../data";
import type { MapEventData, MapEventSpec } from "../types";

const knightEnd = (event: TimelineEvent) => {
    const duration = int(event.data as MapEventData, "Duration");
    return duration === undefined ? null : event.time + duration;
};

export const DRAGON_SHIRE: Record<string, MapEventSpec> = {
    dragon_knight_activated: {
        role: "objective",
        glyph: "knight",
        label: label("dragonKnight"),
        knight: (data, event, events) => {
            const pilot = int(data, "Pilot");
            if (pilot === undefined) return null;
            const end = knightEnd(event);
            return {
                range: [event.time, end],
                pilot,
                takedowns: credited(events, "death", pilot, event.time, end),
                structures: credited(
                    events,
                    "structure_death",
                    pilot,
                    event.time,
                    end,
                ),
            };
        },
    },
};
