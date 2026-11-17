import classNames from "classnames";
import type { CSSProperties, ReactNode } from "react";

import { Eyebrow } from "../eyebrow";
import { rolling } from "../rolling-number/rolling";
import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface StatProps {
    label: ReactNode;
    children: ReactNode;
    note?: ReactNode;
    size?: "sm" | "lg";
    mono?: boolean;
    truncate?: boolean;
    inline?: boolean;
    className?: string;
    valueClassName?: string;
    style?: CSSProperties;
}

export function Stat({
    label,
    children,
    note,
    size = "lg",
    mono = true,
    truncate,
    inline,
    className,
    valueClassName,
    style,
}: StatProps) {
    return (
        <div
            className={classNames(className, styles.root, {
                [styles.inline]: inline,
            })}
            style={style}
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
                {note && (
                    <Typography
                        as="span"
                        size="xs"
                        weight="regular"
                        variant="tertiary"
                        className={styles.note}
                    >
                        {note}
                    </Typography>
                )}
            </Typography>
        </div>
    );
}
