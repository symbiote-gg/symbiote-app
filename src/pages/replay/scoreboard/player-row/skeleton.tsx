import classNames from "classnames";

import { Skeleton, Typography } from "@/ui";
import { STATS } from "../stats";

import styles from "./styles.module.css";

const TIERS = 7;

export interface PlayerRowSkeletonProps {
    className?: string;
}

export function PlayerRowSkeleton({ className }: PlayerRowSkeletonProps) {
    return (
        <div className={classNames(className, styles.root)}>
            <span className={styles.hero}>
                <Skeleton className={styles.portraitBar} />
                <span className={styles.playerText}>
                    <span className={styles.playerName}>
                        <Typography>
                            <Skeleton className={styles.heroBar} />
                        </Typography>
                    </span>
                    <Typography size="sm">
                        <Skeleton className={styles.nameBar} />
                    </Typography>
                </span>
            </span>
            <span className={styles.icons}>
                {Array.from({ length: TIERS }, (_, i) => (
                    <Skeleton key={i} className={styles.talentBar} />
                ))}
            </span>
            <Typography size="sm" noWrap className={styles.number}>
                <Skeleton className={styles.kadBar} />
            </Typography>
            {STATS.map(({ stat, secondary }) => (
                <span
                    key={stat}
                    className={classNames(styles.statCell, {
                        [styles.secondary]: secondary,
                    })}
                >
                    <Typography size="sm" noWrap>
                        <Skeleton className={styles.statBar} />
                    </Typography>
                </span>
            ))}
        </div>
    );
}
