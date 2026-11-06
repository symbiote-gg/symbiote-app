import classNames from "classnames";
import type { ReactNode } from "react";

import { Eyebrow } from "../eyebrow";
import { Typography } from "../typography";

import styles from "./styles.module.css";

/** A label over its value, as a `dt`/`dd` pair: place it inside a `dl`. */
export interface StatProps {
    label: ReactNode;
    children: ReactNode;
    size?: "sm" | "lg";
    mono?: boolean;
    /** For narrow columns: cuts long values with an ellipsis. */
    truncate?: boolean;
    className?: string;
    valueClassName?: string;
}

export function Stat({
    label,
    children,
    size = "lg",
    mono = true,
    truncate,
    className,
    valueClassName,
}: StatProps) {
    return (
        <div className={classNames(className, styles.root)}>
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
                {children}
            </Typography>
        </div>
    );
}
