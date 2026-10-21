import { byTeam, fixed, fromInt, intTeam, label } from "../data";
import type { MapEventSpec } from "../types";

export const VOLSKAYA: Record<string, MapEventSpec> = {
    volskaya_capture_point_complete: {
        role: "objective",
        glyph: "mech",
        label: label("protector"),
        team: fromInt("WinningTeam"),
        race: (data) => {
            const winner = intTeam(data, "WinningTeam");
            const loser = Math.round(fixed(data, "LosingTeamProgress") ?? 0);
            return winner === null
                ? null
                : {
                      kind: "capture",
                      teamValues: byTeam(winner, [100, loser]),
                      unit: "percent",
                  };
        },
    },
    volskaya_capture_point_spawned: {
        role: "ignore",
        glyph: "flag",
        label: label("pointSpawned"),
    },
};
