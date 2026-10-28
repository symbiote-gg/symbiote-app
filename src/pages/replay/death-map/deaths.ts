import type { DeathEntry } from "@/utils/timeline/types";

export const DEATH_FILTERS = ["all", "team", "you", "enemy"] as const;

export type DeathFilter = (typeof DEATH_FILTERS)[number];

export interface PlacedDeath {
    /** Index into the timeline's deaths. */
    id: number;
    entry: DeathEntry;
    layer: number;
    /** On the layer's render, as CSS percentages. */
    at: { left: string; top: string };
}

export function matches(
    filter: DeathFilter,
    entry: DeathEntry,
    allyTeam: number,
    ownerSlot: number,
) {
    switch (filter) {
        case "all":
            return true;
        case "team":
            return entry.team === allyTeam;
        case "you":
            return entry.victim === ownerSlot;
        case "enemy":
            return entry.team !== allyTeam;
    }
}
