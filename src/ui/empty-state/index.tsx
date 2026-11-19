import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export type EmptyStateTone = "muted" | "win";

export interface EmptyStateProps {
    children: string;
    action?: ReactNode;
    /** With a title, the state fills its container and the title heads the text. */
    title?: string;
    icon?: LucideIcon;
    tone?: EmptyStateTone;
}

export function EmptyState({
    children,
    action,
    title,
    icon: Icon,
    tone = "muted",
}: EmptyStateProps) {
    if (title) {
        return (
            <div className={styles.filled}>
                {Icon && (
                    <span className={classNames(styles.badge, styles[tone])}>
                        <Icon className={styles.glyph} aria-hidden />
                    </span>
                )}
                <Typography size="lg" weight="semibold">
                    {title}
                </Typography>
                <Typography variant="tertiary">{children}</Typography>
                {action}
            </div>
        );
    }

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
