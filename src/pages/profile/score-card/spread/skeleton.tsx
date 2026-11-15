import { Skeleton } from "@/ui";

import styles from "./styles.module.css";

// The backend's 5 point bins from 0 to 100.
const BINS = 20;

const HEIGHTS = Array.from({ length: BINS }, (_, index) => {
    const offset = (index + 0.5) / BINS - 0.5;

    return Math.max(Math.exp(-(offset * offset) / 0.04), 0.04);
});

export function SpreadSkeleton() {
    return (
        <div className={styles.plot}>
            {HEIGHTS.map((height, index) => (
                <Skeleton
                    key={index}
                    className={styles.skeletonBar}
                    style={{ height: `${height * 100}%` }}
                />
            ))}
        </div>
    );
}
