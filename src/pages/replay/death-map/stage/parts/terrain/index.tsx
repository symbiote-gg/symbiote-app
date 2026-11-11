import { useId } from "react";

import type { MinimapPaths } from "@/utils/timeline/minimaps";

import styles from "./styles.module.css";

interface TerrainProps {
    width: number;
    height: number;
    paths: MinimapPaths;
}

// The jungle's edge is a glow on the game's minimap. In the paths' own units, the
// same blur the SVG files carry.
const FADE = 3;

export function Terrain({ width, height, paths }: TerrainProps) {
    const id = useId();
    const inside = `${id}inside`;
    const fade = `${id}fade`;

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className={styles.root}
            aria-hidden
        >
            <defs>
                <clipPath id={inside}>
                    <path d={paths.ground} />
                </clipPath>
                <filter id={fade} x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation={FADE} />
                </filter>
            </defs>

            <path d={paths.ground} className={styles.ground} />
            {paths.jungle && (
                <g clipPath={`url(#${inside})`}>
                    <path
                        d={paths.jungle}
                        fillRule="evenodd"
                        filter={`url(#${fade})`}
                        className={styles.jungle}
                    />
                </g>
            )}
            {paths.walls && (
                <path
                    d={paths.walls}
                    fillRule="evenodd"
                    className={styles.walls}
                />
            )}
            {paths.bright && (
                <path
                    d={paths.bright}
                    fillRule="evenodd"
                    className={styles.bright}
                />
            )}
        </svg>
    );
}
