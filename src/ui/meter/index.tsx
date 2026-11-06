import classNames from "classnames";

import { winRateGrade } from "../win-rate";

import styles from "./styles.module.css";

export interface MeterProps {
    value: number;
    neutral?: boolean;
    color?: MeterColor;
    size?: "sm" | "md";
    fromEnd?: boolean;
    className?: string;
}

/**
 * `accent` is the page's accent, from `--accent`, purple when unset. `side`
 * and `sideSoft` are the nearest team's color, for the leading and trailing one.
 */
export type MeterColor =
    "primary" | "mvp" | "accent" | "muted" | "side" | "sideSoft";

export function Meter({
    value,
    neutral,
    color,
    size = "sm",
    fromEnd,
    className,
}: MeterProps) {
    const fill = color ?? winRateGrade(value, !neutral);

    return (
        <span
            className={classNames(className, styles.root, styles[size], {
                [styles.fromEnd]: fromEnd,
            })}
            aria-hidden
        >
            <span
                className={classNames(styles.fill, styles[fill])}
                style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }}
            />
        </span>
    );
}
