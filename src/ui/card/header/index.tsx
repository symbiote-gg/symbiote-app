import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography } from "../../typography";

import styles from "./styles.module.css";

export interface CardHeaderProps {
    title: string;
    subtitle?: ReactNode;
    action?: ReactNode;
    divided?: boolean;
}

export function CardHeader({
    title,
    subtitle,
    action,
    divided,
}: CardHeaderProps) {
    return (
        <header
            className={classNames(styles.root, {
                [styles.divided]: divided,
            })}
        >
            <div className={styles.titles}>
                <Typography size="xl2" display className={styles.title}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="secondary">{subtitle}</Typography>
                )}
            </div>
            {action}
        </header>
    );
}
