import classNames from "classnames";

import styles from "./styles.module.css";

export interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return <span aria-hidden className={classNames(className, styles.root)} />;
}
