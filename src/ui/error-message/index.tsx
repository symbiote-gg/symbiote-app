import classNames from "classnames";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface ErrorMessageProps {
    error: unknown;
    className?: string;
}

export function ErrorMessage({ error, className }: ErrorMessageProps) {
    return (
        <Typography size="sm" className={classNames(className, styles.root)}>
            {String(error)}
        </Typography>
    );
}
