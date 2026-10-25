import type {
    ReplayPlayerDetail,
    Timeline,
    TimelineDeath,
} from "@/api/replays";
import { deathEntries, fightGroups, fightKind } from "@/utils/timeline/markers";
import type { DeathEntry } from "@/utils/timeline/types";

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

export interface UnplacedKills {
    victims: number[];
    count: number;
    /** Takedowns with no killing blow on record that credit the owner. */
    times: number[];
}

/**
 * Scoreboard kills no death places (e.g. on Leoric, whose deaths record no
 * killing blow, or landed by a structure yet credited to a hero), on the
 * victims of the enemy deaths without a killing blow that credit the owner:
 * when no ally falls short of more of those deaths than credit them, and the
 * team's shortfalls add up to no more than those deaths (a minion's kill
 * credits no one).
 */
export function unplacedKills(
    deaths: TimelineDeath[],
    players: ReplayPlayerDetail[],
    ownerSlot: number,
): UnplacedKills | null {
    const teamOf = new Map(players.map((p) => [p.slot, p.team]));
    const team = teamOf.get(ownerSlot);
    if (team === undefined) return null;

    const unplaced = deaths.filter((death) => {
        const victimTeam = teamOf.get(death.victim);
        return (
            death.killingBlow === null &&
            victimTeam !== undefined &&
            victimTeam !== team
        );
    });

    const shortfalls = new Map<number, number>();

    for (const player of players.filter((p) => p.team === team)) {
        if (player.kills === null) return null;
        const placed = deaths.filter(
            (d) => d.killingBlow === player.slot,
        ).length;
        const credited = unplaced.filter((d) =>
            d.killers.includes(player.slot),
        ).length;
        const short = player.kills - placed;
        if (short < 0 || short > credited) return null;
        shortfalls.set(player.slot, short);
    }

    const total = [...shortfalls.values()].reduce((a, b) => a + b, 0);
    const count = shortfalls.get(ownerSlot) ?? 0;

    if (total > unplaced.length || count === 0) return null;

    const credited = unplaced
        .filter((d) => d.killers.includes(ownerSlot))
        .sort((a, b) => a.time - b.time);
    const victims = [...new Set(credited.map((d) => d.victim))];
    const times = credited.map((d) => d.time);

    return { victims, count, times };
}

/**
 * Count unplaced kills as kills when there are as many as takedowns they can
 * be on: each of those takedowns is one. Otherwise they stay unplaced.
 */
export function placeCertainKills(
    entries: OwnerDeath[],
    unplaced: UnplacedKills | null,
): { entries: OwnerDeath[]; unplaced: UnplacedKills | null } {
    if (
        !unplaced ||
        unplaced.victims.length !== 1 ||
        unplaced.count !== unplaced.times.length
    ) {
        return { entries, unplaced };
    }

    const isCertain = ({ death }: OwnerDeath) =>
        death.killingBlow === null &&
        death.victim === unplaced.victims[0] &&
        unplaced.times.includes(death.time);

    return {
        entries: entries.map((entry) =>
            entry.role === "assist" && isCertain(entry)
                ? { ...entry, role: "kill" }
                : entry,
        ),
        unplaced: null,
    };
}
