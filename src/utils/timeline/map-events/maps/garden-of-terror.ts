import { fromInt, label } from "../data";
import type { MapEventSpec } from "../types";

export const GARDEN_OF_TERROR: Record<string, MapEventSpec> = {
    garden_terror_spawned: {
        role: "objective",
        glyph: "sprout",
        label: label("terror"),
        team: fromInt("Team"),
    },
};
