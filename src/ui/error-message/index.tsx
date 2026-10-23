import classNames from "classnames";

import styles from "./styles.module.css";

export interface ErrorMessageProps {
    error: unknown;
    className?: string;
}

export function ErrorMessage({ error, className }: ErrorMessageProps) {
    return (
        <p className={classNames(className, styles.root)}>{String(error)}</p>
    );
}
