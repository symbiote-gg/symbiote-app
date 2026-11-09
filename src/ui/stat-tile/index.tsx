import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow } from "../eyebrow";
import { Typography } from "../typography";

import styles from "./styles.module.css";

/** `row` puts the label beside the value, `panel` stacks them in a raised tile. */
export type StatTileVariant = "row" | "panel";

export interface StatTileProps {
    label: string;
    value: ReactNode;
    accent?: "mvp" | "loss";
    variant?: StatTileVariant;
    /** Shown in a badge before the label, on `panel` only. */
    icon?: LucideIcon;
    /** A line under the value, on `panel` only. */
    detail?: ReactNode;
    className?: string;
}

export function StatTile({
    label,
    value,
    accent,
    variant = "row",
    icon: Icon,
    detail,
    className,
}: StatTileProps) {
    const panel = variant === "panel";

    return (
        <div className={classNames(className, styles.root, styles[variant])}>
            <div className={styles.head}>
                {panel && Icon && (
                    <span className={styles.badge}>
                        <Icon aria-hidden />
                    </span>
                )}
                <Eyebrow className={styles.label}>{label}</Eyebrow>
            </div>
            <Typography
                display={!panel}
                mono={panel}
                truncate
                className={classNames(styles.value, accent && styles[accent])}
            >
                {value}
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
        </div>
    );
}
