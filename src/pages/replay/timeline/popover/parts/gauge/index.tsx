import classNames from "classnames";
import type { ReactNode } from "react";

import styles from "./styles.module.css";

interface GaugeProps {
    percent?: number;
    faded?: boolean;
}

export function Gauge({ percent, faded }: GaugeProps) {
    return (
        <span className={styles.track}>
            {percent !== undefined && (
                <span
                    className={classNames(styles.fill, {
                        [styles.faded]: faded,
                    })}
                    style={{ width: `${percent}%` }}
                />
            )}
        </span>
    );
}

interface GaugeSlotProps {
    children: ReactNode;
}

export function GaugeBadge({ children }: GaugeSlotProps) {
    return <span className={styles.badge}>{children}</span>;
}

export function GaugeValue({ children }: GaugeSlotProps) {
    return <span className={styles.value}>{children}</span>;
}
