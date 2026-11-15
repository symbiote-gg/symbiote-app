import classNames from "classnames";
import type { CSSProperties } from "react";

import styles from "./styles.module.css";

export interface SkeletonProps {
    className?: string;
    style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
    return (
        <span
            aria-hidden
            className={classNames(className, styles.root)}
            style={style}
        />
    );
}
