import classNames from "classnames";
import type { ReactNode } from "react";

import { Eyebrow } from "../eyebrow";
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
            <Eyebrow className={styles.label}>{label}</Eyebrow>
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
