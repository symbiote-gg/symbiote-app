import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export type ChipSize = "sm" | "md";

export type ChipTone = "neutral" | "primary" | "win" | "loss" | "quest";

export interface ChipProps {
    icon?: LucideIcon;
    size?: ChipSize;
    tone?: ChipTone;
    uppercase?: boolean;
    className?: string;
    children: ReactNode;
}

export function Chip({
    icon: Icon,
    size = "md",
    tone = "neutral",
    uppercase,
    className,
    children,
}: ChipProps) {
    return (
        <div
            className={classNames(
                className,
                styles.root,
                styles[size],
                styles[tone],
                { [styles.uppercase]: uppercase },
            )}
        >
            {Icon && <Icon className={styles.icon} aria-hidden />}
            <Typography
                size={size === "sm" ? "xs" : "sm"}
                weight="semibold"
                uppercase={uppercase}
                noWrap
                className={styles.label}
            >
                {children}
            </Typography>
        </div>
    );
}
