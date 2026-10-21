import { label, scoreRace } from "../data";
import type { MapEventSpec } from "../types";

export const TOMB_OF_THE_SPIDER_QUEEN: Record<string, MapEventSpec> = {
    soul_eaters_spawned: {
        role: "objective",
        glyph: "bug",
        label: label("spiders"),
        race: scoreRace("gems"),
    },
};
