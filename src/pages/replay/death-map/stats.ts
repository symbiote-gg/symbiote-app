import { mostFrequent } from "../kill-log/kill-log";
import type { PlacedDeath } from "./deaths";

function topKiller(deaths: PlacedDeath[]) {
    // Known killing blows only: the credited list's order says nothing about
    // who landed one, and a tie has no top killer.
    const blows = deaths.flatMap(({ entry }) => entry.killingBlow ?? []);
    const top = mostFrequent(blows);
    const rival = mostFrequent(blows.filter((slot) => slot !== top?.slot));

    return rival?.count === top?.count ? null : top;
}

export function rangeStats(deaths: PlacedDeath[], allyTeam: number) {
    const ally = deaths.filter(({ entry }) => entry.team === allyTeam);
    const enemy = deaths.filter(({ entry }) => entry.team !== allyTeam);

    return {
        ally: ally.length,
        enemy: enemy.length,
        allyKiller: topKiller(enemy),
        enemyKiller: topKiller(ally),
    };
}

export type RangeStats = ReturnType<typeof rangeStats>;
