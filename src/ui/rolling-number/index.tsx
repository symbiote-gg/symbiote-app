import classNames from "classnames";
import type { CSSProperties } from "react";

import styles from "./styles.module.css";

const DIGIT = /\d/;
const STRIP = "0\n1\n2\n3\n4\n5\n6\n7\n8\n9";

export interface RollingNumberProps {
    value: string;
    className?: string;
}

export function RollingNumber({ value, className }: RollingNumberProps) {
    const chars = [...value];

    return (
        <span className={classNames(className, styles.root)}>
            <span className={styles.label}>{value}</span>
            <span aria-hidden>
                {chars.map((char, index) => {
                    // Keyed from the right, so the ones column stays put when
                    // the number grows a digit.
                    const fromRight = chars.length - 1 - index;

                    if (!DIGIT.test(char)) {
                        return <span key={`${fromRight}-${char}`}>{char}</span>;
                    }

                    const style = {
                        "--digit": char,
                        "--from-right": fromRight,
                    } as CSSProperties;

                    return (
                        <span
                            key={`${fromRight}-digit`}
                            className={styles.column}
                            style={style}
                        >
                            <span className={styles.sizer}>{char}</span>
                            <span className={styles.strip}>{STRIP}</span>
                        </span>
                    );
                })}
            </span>
        </span>
    );
}
