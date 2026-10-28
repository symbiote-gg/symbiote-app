import index from "@/generated/minimaps.json";

export interface MinimapLayer {
    src: string;
    width: number;
    height: number;
    /**
     * Map units at the render's left, top, right and bottom edges: renders frame
     * the map with scenery around. Four of them, checked as the assets are fetched.
     */
    view: number[];
}

const MINIMAPS = index as Record<string, MinimapLayer[]>;

/** A map's renders, e.g. Haunted Mines' surface then mines, or null without any. */
export const minimapOf = (map: string): MinimapLayer[] | null =>
    MINIMAPS[map] ?? null;

const within = (value: number, a: number, b: number) =>
    value >= Math.min(a, b) && value <= Math.max(a, b);

/** The layer whose render covers the point, else the first. */
export function layerOf(layers: MinimapLayer[], x: number, y: number) {
    const found = layers.findIndex(
        ({ view: [left, top, right, bottom] }) =>
            within(x, left, right) && within(y, top, bottom),
    );
    return Math.max(found, 0);
}

/** Where a point falls on the layer's render, as CSS percentages. */
export function project({ view }: MinimapLayer, x: number, y: number) {
    const [left, top, right, bottom] = view;

    return {
        left: `${((x - left) / (right - left)) * 100}%`,
        top: `${((y - top) / (bottom - top)) * 100}%`,
    };
}
