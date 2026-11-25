import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ComponentType, ReactNode, SVGProps } from "react";

import { Eyebrow } from "../eyebrow";
import { rolling } from "../rolling-number/rolling";
import { Typography } from "../typography";

import styles from "./styles.module.css";

export type StatTileVariant = "row" | "panel";

export interface StatTileProps {
    label: string;
    value: ReactNode;
    /** `tone` takes the value colour from `--tone`. */
    accent?: "mvp" | "loss" | "tone";
    variant?: StatTileVariant;
    icon?: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
    iconSize?: "md" | "lg";
    detail?: ReactNode;
    meta?: ReactNode;
    footer?: ReactNode;
    aside?: ReactNode;
    className?: string;
    style?: CSSProperties;
}

export function StatTile({
    label,
    value,
    accent,
    variant = "row",
    icon: Icon,
    iconSize = "md",
    detail,
    meta,
    footer,
    aside,
    className,
    style,
}: StatTileProps) {
    const panel = variant === "panel";
    const split = panel && !!aside;

    const head = (
        <div className={styles.head}>
            {Icon && (
                <span
                    className={classNames(styles.badge, {
                        [styles.large]: iconSize === "lg",
                    })}
                >
                    <Icon aria-hidden />
                </span>
            )}
            {panel ? (
                <Eyebrow className={styles.label}>{label}</Eyebrow>
            ) : (
                <div className={styles.names}>
                    <Eyebrow className={styles.label}>{label}</Eyebrow>
                    {detail && (
                        <Typography size="xs" variant="tertiary" truncate>
                            {detail}
                        </Typography>
                    )}
                </div>
            )}
            {split && meta && (
                <Typography
                    size="xs"
                    variant="tertiary"
                    truncate
                    className={styles.meta}
                >
                    {meta}
                </Typography>
            )}
        </div>
    );

    const facts = (
        <>
            <Typography
                display={!panel}
                mono={panel}
                truncate
                className={classNames(styles.value, accent && styles[accent])}
            >
                {rolling(value)}
            </Typography>
            {panel && detail && (
                <Typography
                    size="xs"
                    variant="tertiary"
                    truncate
                    className={styles.detail}
                >
                    {detail}
                </Typography>
            )}
            {panel && footer}
        </>
    );

    return (
        <div
            className={classNames(
                className,
                styles.root,
                styles[variant],
                split && styles.split,
            )}
            style={style}
        >
            {head}
            {split ? (
                <div className={styles.columns}>
                    <div className={styles.main}>{facts}</div>
                    <div className={styles.aside}>{aside}</div>
                </div>
            ) : (
                facts
            )}
        </div>
    );
}
