import classNames from "classnames";
import { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "../../typography";

import styles from "./styles.module.css";

export type CardHeaderSize = "sm" | "md";

export interface CardHeaderProps {
    title: string;
    icon?: LucideIcon;
    subtitle?: ReactNode;
    action?: ReactNode;
    divided?: boolean;
    size?: CardHeaderSize;
}

export function CardHeader({
    title,
    icon: Icon,
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
                <div className={styles.titleWrapper}>
                    {Icon && <Icon className={styles.icon} />}
                    <Typography size="xl2" display className={styles.title}>
                        {title}
                    </Typography>
                </div>
                {subtitle && (
                    <Typography variant="tertiary">{subtitle}</Typography>
                )}
            </div>
            {action}
        </header>
    );
}
