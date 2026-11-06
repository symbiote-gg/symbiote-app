import type { ReactNode } from "react";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface EmptyStateProps {
    children: string;
    action?: ReactNode;
}

export function EmptyState({ children, action }: EmptyStateProps) {
    if (!action) {
        return (
            <Typography size="sm" variant="tertiary" className={styles.root}>
                {children}
            </Typography>
        );
    }

    return (
        <div className={styles.withAction}>
            <Typography size="sm" variant="tertiary">
                {children}
            </Typography>
            {action}
        </div>
    );
}
