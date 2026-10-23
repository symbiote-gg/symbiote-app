import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface StatTileProps {
    label: string;
    value: ReactNode;
    accent?: "mvp";
}

export function StatTile({ label, value, accent }: StatTileProps) {
    return (
        <div className={styles.root}>
            <Typography size="xs" variant="tertiary" className={styles.label}>
                {label}
            </Typography>
            <Typography
                display
                truncate
                className={classNames(styles.value, accent && styles[accent])}
            >
                {value}
            </Typography>
        </div>
    );
}
