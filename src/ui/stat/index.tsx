import classNames from "classnames";
import type { ReactNode } from "react";

import { Eyebrow } from "../eyebrow";
import { rolling } from "../rolling-number/rolling";
import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface StatProps {
    label: ReactNode;
    children: ReactNode;
    size?: "sm" | "lg";
    mono?: boolean;
    truncate?: boolean;
    inline?: boolean;
    className?: string;
    valueClassName?: string;
}

export function Stat({
    label,
    children,
    size = "lg",
    mono = true,
    truncate,
    inline,
    className,
    valueClassName,
}: StatProps) {
    return (
        <div
            className={classNames(className, styles.root, {
                [styles.inline]: inline,
            })}
        >
            <Eyebrow as="dt" truncate>
                {label}
            </Eyebrow>
            <Typography
                as="dd"
                size={size === "sm" ? "sm" : "base"}
                weight="semibold"
                mono={mono}
                truncate={truncate}
                noWrap={!truncate}
                className={classNames(
                    valueClassName,
                    styles.value,
                    styles[size],
                )}
            >
                {rolling(children)}
            </Typography>
        </div>
    );
}
