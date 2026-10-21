import { fromInt, label } from "../data";
import type { MapEventSpec } from "../types";

export const WARHEAD_JUNCTION: Record<string, MapEventSpec> = {
    warhead_junction_nuke_fired: {
        role: "objective",
        glyph: "nuke",
        label: label("nuke"),
        team: fromInt("OwningTeam"),
    },
    warhead_junction_nuke_collected: {
        role: "ignore",
        glyph: "nuke",
        label: label("nukePickup"),
    },
    warhead_junction_nuke_dropped: {
        role: "ignore",
        glyph: "nuke",
        label: label("nukeDrop"),
    },
    warhead_junction_nukes_spawned: {
        role: "ignore",
        glyph: "nuke",
        label: label("nukesSpawned"),
    },
};
