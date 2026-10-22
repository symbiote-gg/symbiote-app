import type { MapEventSpec } from "../types";

export const TOWERS_OF_DOOM: Record<string, MapEventSpec> = {
    altar_captured: { role: "objective", glyph: "temple", label: "altar" },
    six_town_event_start: {
        role: "objective",
        glyph: "temple",
        label: "allAltars",
    },
};
