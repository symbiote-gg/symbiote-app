import type { MapEventSpec } from "../types";

export const INFERNAL_SHRINES: Record<string, MapEventSpec> = {
    infernal_shrine_captured: {
        role: "objective",
        glyph: "star",
        label: "shrine",
    },
    punisher_killed: {
        role: "objective",
        glyph: "orb",
        label: "punisher",
        variants: {
            frozen: { glyph: "frost", label: "frozen" },
            arcane: { glyph: "arcane", label: "arcane" },
            bombard: { glyph: "fire", label: "bombard" },
        },
    },
};
