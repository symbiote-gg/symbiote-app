import classNames from "classnames";

import styles from "./styles.module.css";

export interface RadioDotProps {
    checked: boolean;
}

export function RadioDot({ checked }: RadioDotProps) {
    return (
        <span
            className={classNames(styles.dot, { [styles.on]: checked })}
            aria-hidden
        />
    );
}
