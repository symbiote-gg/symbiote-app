import { fixed, label } from "../data";
import type { MapEventData, MapEventSpec } from "../types";

const progress = (data: MapEventData) =>
    [
        fixed(data, "TeamOrderProgress") ?? 0,
        fixed(data, "TeamChaosProgress") ?? 0,
    ] as const;

export const BRAXIS_HOLDOUT: Record<string, MapEventSpec> = {
    braxis_holdout_map_event_complete: {
        role: "objective",
        glyph: "swarm",
        label: label("zergWave"),
        team: (data) => {
            const [order, chaos] = progress(data);
            return order === chaos ? null : order > chaos ? 0 : 1;
        },
        race: (data) => {
            const [order, chaos] = progress(data);
            return {
                kind: "wave",
                teamValues: [Math.round(order), Math.round(chaos)],
                unit: "percent",
            };
        },
    },
};
