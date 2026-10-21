import { fromInt, label } from "../data";
import type { MapEventSpec } from "../types";

export const ALTERAC_PASS: Record<string, MapEventSpec> = {
    alterac_cavalry_charge: {
        role: "objective",
        glyph: "flag",
        label: label("cavalry"),
        team: fromInt("Team"),
    },
};
