import classNames from "classnames";

import styles from "./styles.module.css";

export type ButtonVariant = "primary" | "secondary";

export type ButtonSize = "sm" | "md";

export const buttonClassName = (
    variant: ButtonVariant,
    size: ButtonSize = "md",
) => classNames(styles.root, styles[variant], styles[size]);

export const linkClassName = styles.link;
