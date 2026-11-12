import classNames from "classnames";
import type { CSSProperties } from "react";

import { winRateGrade } from "../win-rate/grade";

import styles from "./styles.module.css";

export interface MeterProps {
    value: number;
    neutral?: boolean;
    color?: MeterColor;
    track?: MeterColor;
    size?: "sm" | "md";
    fromEnd?: boolean;
    className?: string;
}

/**
 * `accent` is the page's accent, from `--accent`, purple when unset. `side`
 * and `sideSoft` are the nearest team's color, for the leading and trailing one.
 */
export type MeterColor =
    "primary" | "mvp" | "accent" | "muted" | "side" | "sideSoft" | "loss";

export function Meter({
    value,
    neutral,
    color,
    track,
    size = "sm",
    fromEnd,
    className,
}: MeterProps) {
    const fill = color ?? winRateGrade(value, !neutral);
    const share = Math.min(1, Math.max(0, value));

    return (
        <span
            className={classNames(className, styles.root, styles[size], {
                [styles.fromEnd]: fromEnd,
            })}
            style={{ "--share": share } as CSSProperties}
            aria-hidden
        >
            <span className={classNames(styles.fill, styles[fill])} />
            <span
                className={classNames(
                    styles.fill,
                    styles.rest,
                    track && styles[track],
                )}
            />
        </span>
    );
}
