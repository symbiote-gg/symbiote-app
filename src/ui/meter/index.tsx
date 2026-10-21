import classNames from "classnames";

import styles from "./styles.module.css";

export interface MeterProps {
    value: number;
    className?: string;
}

const HIGH = 0.55;
const LOW = 0.5;

export function Meter({ value, className }: MeterProps) {
    const tone = value >= HIGH ? "high" : value < LOW ? "low" : "mid";

    return (
        <span className={classNames(className, styles.root)} aria-hidden>
            <span
                className={classNames(styles.fill, styles[tone])}
                style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%` }}
            />
        </span>
    );
}
