import classNames from "classnames";

import { winRateGrade } from "../win-rate";

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

    const showFill = !track || share > 0;
    const showRest = track && share < 1;

    return (
        <span
            className={classNames(className, styles.root, styles[size], {
                [styles.split]: track,
                [styles.fromEnd]: fromEnd,
            })}
            aria-hidden
        >
            {showFill && (
                <span
                    className={classNames(styles.fill, styles[fill])}
                    style={{ width: `${share * 100}%` }}
                />
            )}
            {showRest && (
                <span
                    className={classNames(
                        styles.fill,
                        styles.rest,
                        styles[track],
                    )}
                />
            )}
        </span>
    );
}
