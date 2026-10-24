import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography } from "../../typography";

import styles from "./styles.module.css";

export type CardHeaderSize = "sm" | "md";

export interface CardHeaderProps {
    title: string;
    subtitle?: ReactNode;
    action?: ReactNode;
    divided?: boolean;
    size?: CardHeaderSize;
}

export function CardHeader({
    title,
    subtitle,
    action,
    divided,
    size = "md",
}: CardHeaderProps) {
    return (
        <header
            className={classNames(styles.root, styles[size], {
                [styles.divided]: divided,
            })}
        >
            <div className={styles.titles}>
                <Typography size="xl2" display className={styles.title}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="tertiary">{subtitle}</Typography>
                )}
            </div>
            {action}
        </header>
    );
}
