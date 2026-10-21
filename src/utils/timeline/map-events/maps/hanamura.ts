import { fromInt, label } from "../data";
import type { MapEventSpec } from "../types";

export const HANAMURA: Record<string, MapEventSpec> = {
    hanamura_payload_delivered: {
        role: "objective",
        glyph: "cart",
        label: label("payload"),
        team: fromInt("Team"),
    },
};
