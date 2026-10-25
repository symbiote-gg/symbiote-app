import type { Timeline } from "@/api/replays";
import { deathEntries, fightGroups, fightKind } from "./markers";
import type { DeathEntry } from "./types";

export type DeathKind =
    "solo" | "pick" | "gank" | "skirmish" | "teamFight" | "ai";
export type DeathRole = "kill" | "assist" | "death";

export interface OwnerDeath {
    death: DeathEntry;
    kind: DeathKind;
    role: DeathRole;
}

function deathKind(death: DeathEntry, group: DeathEntry[]): DeathKind {
    if (death.killers.length === 0) return "ai";
    if (group.length >= 3) return "teamFight";
    if (group.length === 2) return "skirmish";
    if (death.killers.length === 1) return "solo";
    return fightKind([death]) === "gank" ? "gank" : "pick";
}

/** A takedown with no killing blow on record still counts as an assist. */
function roleOf(death: DeathEntry, slot: number): DeathRole | null {
    if (death.victim === slot) return "death";
    if (death.killingBlow === slot) return "kill";
    return death.killers.includes(slot) ? "assist" : null;
}

export function ownerDeaths(
    timeline: Timeline,
    duration: number,
    allyTeam: number,
    ownerSlot: number,
): OwnerDeath[] {
    return fightGroups(deathEntries(timeline, allyTeam), duration).flatMap(
        (group) =>
            group.flatMap((death) => {
                const role = roleOf(death, ownerSlot);
                return role
                    ? [{ death, kind: deathKind(death, group), role }]
                    : [];
            }),
    );
}

export const killerOf = (death: DeathEntry) =>
    death.killingBlow ?? death.killers[0] ?? null;
