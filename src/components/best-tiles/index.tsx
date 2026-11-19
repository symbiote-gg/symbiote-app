import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

import { Eyebrow, Skeleton, Typography } from "@/ui";

import styles from "./styles.module.css";

export type BestTile = {
    key: string;
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    replayId?: number;
};

export interface BestTilesProps {
    tiles: BestTile[];
}

export function BestTiles({ tiles }: BestTilesProps) {
    return (
        <ul className={styles.tiles}>
            {tiles.map((tile) => (
                <li key={tile.key} className={styles.item}>
                    {tile.replayId === undefined ? (
                        <div className={styles.tile}>
                            <TileBody tile={tile} />
                        </div>
                    ) : (
                        <Link
                            href={`/replays/${tile.replayId}`}
                            className={classNames(styles.tile, styles.link)}
                        >
                            <TileBody tile={tile} />
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    );
}

interface TileBodyProps {
    tile: BestTile;
}

function TileBody({ tile }: TileBodyProps) {
    return (
        <>
            <tile.icon aria-hidden className={styles.watermark} />
            <Eyebrow truncate>{tile.label}</Eyebrow>
            <div className={styles.body}>
                <Typography display className={styles.value}>
                    {tile.value}
                </Typography>
                <Typography size="sm" variant="secondary" truncate>
                    {tile.detail}
                </Typography>
            </div>
        </>
    );
}

export interface BestTilesSkeletonProps {
    count: number;
}

export function BestTilesSkeleton({ count }: BestTilesSkeletonProps) {
    return (
        <ul className={styles.tiles}>
            {Array.from({ length: count }, (_, i) => (
                <li key={i} className={styles.item}>
                    <div className={styles.tile}>
                        <Eyebrow>
                            <Skeleton />
                        </Eyebrow>
                        <div className={styles.body}>
                            <Typography display className={styles.value}>
                                <Skeleton className={styles.valueBar} />
                            </Typography>
                            <Typography size="sm">
                                <Skeleton className={styles.detailBar} />
                            </Typography>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
