import type { DeathKind, DeathRole, KillLog, Timeline } from "@/api/replays";
import { deathEntries } from "@/utils/timeline/markers";
import type { DeathEntry } from "@/utils/timeline/types";

export interface OwnerDeath {
    death: DeathEntry;
    kind: DeathKind;
    role: DeathRole;
}

export function ownerDeaths(
    timeline: Timeline,
    killLog: KillLog,
    allyTeam: number,
): OwnerDeath[] {
    const deaths = deathEntries(timeline, allyTeam);
    return killLog.entries.map(({ death, kind, role }) => ({
        death: deaths[death],
        kind,
        role,
    }));
}

export const killerOf = (death: DeathEntry) =>
    death.killingBlow ?? death.killers[0] ?? null;

export interface TopSlot {
    slot: number;
    count: number;
}

export function mostFrequent(slots: (number | null)[]): TopSlot | null {
    const counts = new Map<number, number>();
    for (const slot of slots) {
        if (slot !== null) counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }

    let top: TopSlot | null = null;
    for (const [slot, count] of counts) {
        if (!top || count > top.count) top = { slot, count };
    }

    return top && top.count > 1 ? top : null;
}
