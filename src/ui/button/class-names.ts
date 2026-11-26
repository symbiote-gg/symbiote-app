import classNames from "classnames";

import styles from "./styles.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonSize = "sm" | "md" | "icon" | "iconSm";

export const buttonClassName = (
    variant: ButtonVariant,
    size: ButtonSize = "md",
) => classNames(styles.root, styles[variant], styles[size]);

export const linkClassName = styles.link;
