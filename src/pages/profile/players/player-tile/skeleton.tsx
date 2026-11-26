import { Skeleton, Typography } from "@/ui";

import styles from "./styles.module.css";

export function PlayerTileSkeleton() {
    return (
        <li className={styles.root}>
            <Skeleton className={styles.portraitBar} />

            <div className={styles.names}>
                <Typography size="lg">
                    <Skeleton className={styles.nameBar} />
                </Typography>
                <Typography size="sm">
                    <Skeleton className={styles.detailBar} />
                </Typography>
            </div>

            <div className={styles.figure}>
                <Typography as="span" display className={styles.rate}>
                    <Skeleton className={styles.rateBar} />
                </Typography>
                <Typography as="span" size="sm">
                    <Skeleton className={styles.recordBar} />
                </Typography>
            </div>
        </li>
    );
}
