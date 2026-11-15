import { useTranslations } from "use-intl";

import type { ScorePillarId } from "@/api/stats";
import { Skeleton, Typography } from "@/ui";
import { pillarTone } from "../tones";

import styles from "./styles.module.css";

export interface PartsSkeletonProps {
    ids: ScorePillarId[];
}

export function PartsSkeleton({ ids }: PartsSkeletonProps) {
    const t = useTranslations("profile.score");

    return (
        <ul className={styles.root}>
            {ids.map((id) => (
                <li key={id} className={styles.part} style={pillarTone(id)}>
                    <div className={styles.head}>
                        <span className={styles.dot} />
                        <Typography
                            as="span"
                            size="sm"
                            weight="semibold"
                            truncate
                        >
                            {t(`pillar.${id}`)}
                        </Typography>
                        <Skeleton className={styles.meterBar} />
                        <Typography
                            as="span"
                            size="sm"
                            className={styles.value}
                        >
                            <Skeleton className={styles.valueBar} />
                        </Typography>
                        <span />
                    </div>
                </li>
            ))}
        </ul>
    );
}
