import type { CSSProperties } from "react";

import index from "@/generated/minimaps.json";

export interface MinimapPaths {
    ground: string;
    jungle?: string;
    walls?: string;
    bright?: string;
}

export interface MinimapLayer {
    paths: MinimapPaths;
    width: number;
    height: number;
    view: number[];
}

const MINIMAPS = index as Record<string, MinimapLayer[]>;

export const minimapOf = (map: string): MinimapLayer[] | null =>
    MINIMAPS[map] ?? null;

const within = (value: number, a: number, b: number) =>
    value >= Math.min(a, b) && value <= Math.max(a, b);

/** The layer whose minimap covers the point, else the first. */
export function layerOf(layers: MinimapLayer[], x: number, y: number) {
    const found = layers.findIndex(
        ({ view: [left, top, right, bottom] }) =>
            within(x, left, right) && within(y, top, bottom),
    );
    return Math.max(found, 0);
}

/** Where a point falls on the layer's minimap, as the percentages the stage reads. */
export function project({ view }: MinimapLayer, x: number, y: number) {
    const [left, top, right, bottom] = view;

    return {
        "--x": `${((x - left) / (right - left)) * 100}%`,
        "--y": `${((y - top) / (bottom - top)) * 100}%`,
    } as CSSProperties;
}
