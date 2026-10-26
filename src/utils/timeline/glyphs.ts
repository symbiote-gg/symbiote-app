import type { FightKind } from "@/api/replays";
import { type Glyph, specGlyph } from "./map-events";
import type { Entry } from "./types";

/** Blackheart's Bay doubloon camps feed the objective, unlike mercenary camps. */
export const campGlyph = (campType: string | null, stolen: boolean): Glyph =>
    stolen ? "hat-glasses" : campType === "Doubloons Camp" ? "coins" : "tent";

export const entryGlyph = (entry: Entry): Glyph => {
    switch (entry.type) {
        case "death":
            return "skull";
        case "camp":
            return campGlyph(entry.campType, entry.stolen);
        case "structure":
            return entry.keep ? "keep" : "castle";
        case "map":
            return entry.spec
                ? specGlyph(entry.spec, entry.objective.variant)
                : "flag";
    }
};

export const fightGlyph = (kind: FightKind): Glyph =>
    kind === "gank" ? "ghost" : kind === "pick" ? "skull" : "swords";

export const tickGlyph = (entries: Entry[]): Glyph => {
    const glyphs = new Set(entries.map(entryGlyph));
    return glyphs.size === 1 ? [...glyphs][0] : "layers";
};
