import { Skeleton, Typography } from "@/ui";
import { HeroTiersSkeleton } from "./heroes/skeleton";
import { HistorySkeleton } from "./history/skeleton";
import { Ladder } from "./ladder";
import { PartsSkeleton } from "./parts/skeleton";
import { RingSkeleton } from "./ring";

import styles from "./styles.module.css";

export function BodySkeleton() {
    return (
        <div className={styles.body}>
            <div className={styles.overview}>
                <div className={styles.rating}>
                    <RingSkeleton />
                    <Typography size="sm">
                        <Skeleton className={styles.progressBar} />
                    </Typography>
                </div>
                <PartsSkeleton
                    ids={["fighting", "survival", "teamRole", "map"]}
                    className={styles.parts}
                />
            </div>
            <Ladder score={null} />
            <HistorySkeleton />
            <HeroTiersSkeleton />
        </div>
    );
}
