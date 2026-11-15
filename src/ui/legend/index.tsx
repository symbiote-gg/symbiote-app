import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface LegendItem {
    key: string;
    label: ReactNode;
    swatch: string;
}

export interface LegendProps {
    items: LegendItem[];
    size?: "xs" | "sm";
    className?: string;
}

export function Legend({ items, size = "sm", className }: LegendProps) {
    return (
        <ul className={classNames(className, styles.root, styles[size])}>
            {items.map((item) => (
                <li key={item.key} className={styles.item}>
                    <span
                        aria-hidden
                        className={classNames(styles.swatch, item.swatch)}
                    />
                    <Typography size={size} variant="tertiary" noWrap>
                        {item.label}
                    </Typography>
                </li>
            ))}
        </ul>
    );
}
