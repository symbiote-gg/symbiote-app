import classNames from "classnames";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";

import type { ScorePillarId } from "@/api/stats";
import { Skeleton, Typography } from "@/ui";
import { pillarTone } from "../tones";

import styles from "./styles.module.css";

// The rows a typical profile shows. Team role holds four stats but each role
// weighs two, so a pool of a few roles mostly lands on three.
const STAT_ROWS: Record<ScorePillarId, number> = {
    fighting: 3,
    survival: 2,
    teamRole: 3,
    map: 3,
};

// Rows run heaviest first, so the tracks shorten down a part.
const ROW_WEIGHTS = [1, 0.55, 0.3];

export interface PartsSkeletonProps {
    ids: ScorePillarId[];
    className?: string;
}

export function PartsSkeleton({ ids, className }: PartsSkeletonProps) {
    const t = useTranslations("profile.score");

    return (
        <ul className={classNames(styles.root, className)}>
            {ids.map((id) => (
                <li key={id} className={styles.part} style={pillarTone(id)}>
                    <div className={styles.head}>
                        <span className={styles.dot} />
                        <Typography as="span" weight="semibold" truncate>
                            {t(`pillar.${id}`)}
                        </Typography>
                        <Typography
                            as="span"
                            size="lg"
                            className={styles.total}
                        >
                            <Skeleton className={styles.valueBar} />
                        </Typography>
                    </div>
                    <Skeleton className={styles.meterBar} />
                    <ul className={styles.stats}>
                        {Array.from({ length: STAT_ROWS[id] }, (_, index) => (
                            <li key={index} className={styles.stat}>
                                <Typography as="span" size="sm">
                                    <Skeleton className={styles.labelBar} />
                                </Typography>
                                <span
                                    className={styles.track}
                                    style={
                                        {
                                            "--weight": ROW_WEIGHTS[index],
                                        } as CSSProperties
                                    }
                                >
                                    <Skeleton className={styles.statBar} />
                                </span>
                                <Typography as="span" size="sm">
                                    <Skeleton className={styles.valueBar} />
                                </Typography>
                            </li>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}
