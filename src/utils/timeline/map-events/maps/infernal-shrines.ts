import type { TimelineEvent } from "@/api/replays";
import { byTeam, fixed, fromInt, int, intTeam, label, pair } from "../data";
import type {
    Glyph,
    MapEventData,
    MapEventSpec,
    ObjectiveLabel,
} from "../types";

const PUNISHER_LABELS: Record<string, ObjectiveLabel> = {
    FrozenShrine: "frozen",
    ArcaneShrine: "arcane",
    BombardShrine: "bombard",
};

const PUNISHER_GLYPHS: Record<string, Glyph> = {
    FrozenShrine: "frost",
    ArcaneShrine: "arcane",
    BombardShrine: "fire",
};

const punisherRange = (
    data: MapEventData,
    event: TimelineEvent,
): [number, number] | null => {
    const duration = int(data, "Duration");
    return duration ? [Math.max(event.time - duration, 0), event.time] : null;
};

export const INFERNAL_SHRINES: Record<string, MapEventSpec> = {
    infernal_shrine_captured: {
        role: "objective",
        glyph: "star",
        label: label("shrine"),
        team: fromInt("Winning Team"),
        race: (data) => {
            const winner = intTeam(data, "Winning Team");
            const score = pair(data, "Winning Score", "Losing Score");
            return winner === null || !score
                ? null
                : { kind: "shrine", teamValues: byTeam(winner, score) };
        },
    },
    punisher_killed: {
        role: "objective",
        glyph: "orb",
        glyphFor: (data) =>
            PUNISHER_GLYPHS[data.strings?.["Punisher Type"] ?? ""] ?? "orb",
        label: (data) =>
            PUNISHER_LABELS[data.strings?.["Punisher Type"] ?? ""] ??
            "punisher",
        team: fromInt("Owning Team of Punisher"),
        lifetime: (event) => punisherRange(event.data as MapEventData, event),
        summon: (data, event) => {
            const range = punisherRange(data, event);
            return range
                ? {
                      range,
                      siege: Math.round(fixed(data, "Siege Damage Done") ?? 0),
                      heroes: Math.round(fixed(data, "Hero Damage Done") ?? 0),
                  }
                : null;
        },
    },
};
