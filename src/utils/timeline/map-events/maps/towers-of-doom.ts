import { fromInt, int, intTeam, label } from "../data";
import type { MapEventData, MapEventSpec } from "../types";

export const TOWERS_OF_DOOM: Record<string, MapEventSpec> = {
    altar_captured: {
        role: "objective",
        glyph: "temple",
        label: label("altar"),
        team: fromInt("Firing Team"),
        altar: (data) => {
            const winner = intTeam(data, "Firing Team");
            return winner === null
                ? null
                : { winner, towns: int(data, "Towns Owned") ?? 0 };
        },
    },
    six_town_event_start: {
        role: "objective",
        glyph: "temple",
        label: label("allAltars"),
        team: fromInt("Owning Team"),
        held: (event, events) => {
            const team = intTeam(event.data as MapEventData, "Owning Team");
            const end = events.find(
                (other) =>
                    other.kind === "six_town_event_end" &&
                    other.time > event.time &&
                    intTeam(other.data as MapEventData, "Owning Team") === team,
            );
            return end ? [event.time, end.time] : null;
        },
    },
    six_town_event_end: {
        role: "ignore",
        glyph: "temple",
        label: label("allAltars"),
    },
    town_captured: {
        role: "ignore",
        glyph: "castle",
        label: label("allAltars"),
    },
};
