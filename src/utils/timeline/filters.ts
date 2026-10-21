import type { Glyph } from "./map-events";

export type Filter = "fights" | "objectives" | "structures" | "camps";

export const FILTERS: Filter[] = [
    "fights",
    "objectives",
    "structures",
    "camps",
];

export const STORAGE_KEY = "timeline.filters";
export const ME_STORAGE_KEY = "timeline.me";

export const FILTER_GLYPHS: Record<Filter, Glyph> = {
    fights: "swords",
    objectives: "layers",
    structures: "castle",
    camps: "tent",
};
