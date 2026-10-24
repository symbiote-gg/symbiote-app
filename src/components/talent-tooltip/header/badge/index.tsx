import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography } from "@/ui";

import styles from "./styles.module.css";

export interface BadgeProps {
    variant: "level" | "quest" | "storm";
    children: ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
    return (
        <Typography
            size="xs"
            weight="semibold"
            uppercase
            noWrap
            className={classNames(styles.root, styles[variant])}
        >
            {children}
        </Typography>
    );
}
