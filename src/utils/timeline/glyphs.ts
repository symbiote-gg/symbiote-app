import { type Glyph, specGlyph } from "./map-events";
import { fightKind } from "./markers";
import type { DeathEntry, Entry } from "./types";

/** Blackheart's Bay doubloon camps feed the objective, unlike mercenary camps. */
export const campGlyph = (campType: string | null): Glyph =>
    campType === "Doubloons Camp" ? "coins" : "tent";

export const entryGlyph = (entry: Entry): Glyph => {
    switch (entry.type) {
        case "death":
            return "skull";
        case "camp":
            return campGlyph(entry.campType);
        case "structure":
            return entry.keep ? "keep" : "castle";
        case "map":
            return entry.spec
                ? specGlyph(entry.spec, entry.objective.variant)
                : "flag";
    }
};

export const fightGlyph = (deaths: DeathEntry[]): Glyph => {
    if (deaths.length > 1) return "swords";
    return fightKind(deaths) === "gank" ? "ghost" : "skull";
};

export const tickGlyph = (entries: Entry[]): Glyph => {
    const glyphs = new Set(entries.map(entryGlyph));
    return glyphs.size === 1 ? [...glyphs][0] : "layers";
};
