import type { ReactNode } from "react";

import { Meter } from "@/ui";

import styles from "./styles.module.css";

interface GaugeProps {
    percent?: number;
    faded?: boolean;
}

export function Gauge({ percent = 0, faded }: GaugeProps) {
    return (
        <Meter
            value={percent / 100}
            color={faded ? "sideSoft" : "side"}
            size="md"
            className={styles.track}
        />
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
