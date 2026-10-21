import { label, scoreRace } from "../data";
import type { MapEventSpec } from "../types";

export const CURSED_HOLLOW: Record<string, MapEventSpec> = {
    raven_curse_activated: {
        role: "objective",
        glyph: "raven",
        label: label("curse"),
        race: scoreRace("curse"),
    },
    tribute_collected: {
        role: "objective",
        glyph: "raven",
        label: label("tribute"),
    },
};
