import type { ReplayPlayerDetail } from "@/api/replays";

export interface Roster {
    players: ReplayPlayerDetail[];
    allyTeam: number;
    highlightSlot: number | null;
}

export function playerOf(roster: Roster, slot: number) {
    return roster.players.find((p) => p.slot === slot);
}

export function heroName(roster: Roster, slot: number) {
    return playerOf(roster, slot)?.heroName ?? "?";
}
