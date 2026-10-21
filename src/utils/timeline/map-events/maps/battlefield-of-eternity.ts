import { fixed, fromInt, int, intTeam, label } from "../data";
import type { MapEventSpec } from "../types";

export const BATTLEFIELD_OF_ETERNITY: Record<string, MapEventSpec> = {
    immortal_defeated: {
        role: "objective",
        glyph: "fist",
        label: label("immortal"),
        team: fromInt("Winning Team"),
        duel: (data, event) => {
            const winner = intTeam(data, "Winning Team");
            const duration = int(data, "Immortal Fight Duration") ?? 0;
            return winner === null
                ? null
                : {
                      range: [Math.max(event.time - duration, 0), event.time],
                      winner,
                      power: Math.round(
                          fixed(data, "Immortal Power Percent") ?? 0,
                      ),
                  };
        },
    },
    boss_duel_started: {
        role: "ignore",
        glyph: "crown",
        label: label("bossDuel"),
    },
};
