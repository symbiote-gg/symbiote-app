import classNames from "classnames";
import { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "../../typography";

import styles from "./styles.module.css";

export type CardHeaderSize = "sm" | "md";

export interface CardHeaderProps {
    title: ReactNode;
    icon?: LucideIcon;
    addon?: ReactNode;
    subtitle?: ReactNode;
    meta?: ReactNode;
    action?: ReactNode;
    divided?: boolean;
    size?: CardHeaderSize;
}

export function CardHeader({
    title,
    icon: Icon,
    addon,
    subtitle,
    meta,
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
                    {addon}
                </div>
                {subtitle && (
                    <Typography variant="tertiary" className={styles.subtitle}>
                        {subtitle}
                    </Typography>
                )}
                {meta}
            </div>
            {action}
        </header>
    );
}
