import * as maps from "./maps";
import type { MapEventSpec } from "./types";

export * from "./types";

export const MAP_EVENTS: Record<string, MapEventSpec> = Object.assign(
    {},
    ...Object.values(maps),
);

const variantOf = (spec: MapEventSpec, variant: string | null) =>
    (variant !== null && spec.variants?.[variant]) || spec;

export const specGlyph = (spec: MapEventSpec, variant: string | null) =>
    variantOf(spec, variant).glyph;

export const specLabel = (spec: MapEventSpec, variant: string | null) =>
    variantOf(spec, variant).label;

export function humanize(kind: string) {
    const words = kind.replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}
