import type { MapEventSpec } from "../types";

export const CURSED_HOLLOW: Record<string, MapEventSpec> = {
    raven_curse_activated: {
        role: "objective",
        glyph: "raven",
        label: "curse",
    },
    tribute_collected: { role: "objective", glyph: "raven", label: "tribute" },
};
