import { label, scoreRace } from "../data";
import type { MapEventSpec } from "../types";

export const BLACKHEARTS_BAY: Record<string, MapEventSpec> = {
    ghost_ship_captured: {
        role: "objective",
        glyph: "ship",
        label: label("ghostShip"),
        race: scoreRace("ship"),
    },
};
