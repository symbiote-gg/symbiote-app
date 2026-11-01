import type { CSSProperties } from "react";

import type { DeathKind, ReplayPlayerDetail, Timeline } from "@/api/replays";
import type { DeathEntry } from "@/utils/timeline/types";

export const DEATH_FILTERS = ["you", "all", "team", "enemy"] as const;

export type DeathFilter = (typeof DEATH_FILTERS)[number];

export interface PlacedDeath {
    /** Index into the timeline's deaths. */
    id: number;
    entry: DeathEntry;
    layer: number;
    /** From `project`. */
    at: CSSProperties;
}

/** Deaths can credit slots no player holds, e.g. 0 or 11: those aren't heroes. */
export function withPlayerKillers(
    entry: DeathEntry,
    players: ReplayPlayerDetail[],
): DeathEntry {
    const isPlayer = (slot: number) => players.some((p) => p.slot === slot);

    return {
        ...entry,
        killers: entry.killers.filter(isPlayer),
        killingBlow:
            entry.killingBlow !== null && isPlayer(entry.killingBlow)
                ? entry.killingBlow
                : null,
    };
}

export function deathKinds(deaths: PlacedDeath[], { fights }: Timeline) {
    const credited = new Map(
        deaths.map(({ id, entry }) => [id, entry.killers.length]),
    );
    const byDeath = new Map<number, DeathKind>();

    for (const fight of fights) {
        for (const index of fight.deaths) {
            const killers = credited.get(index);

            if (killers === 0) byDeath.set(index, "ai");
            else if (killers === 1 && fight.deaths.length === 1)
                byDeath.set(index, "solo");
            else byDeath.set(index, fight.kind);
        }
    }

    return byDeath;
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
