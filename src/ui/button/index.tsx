import classNames from "classnames";
import type { ButtonHTMLAttributes } from "react";

import styles from "./styles.module.css";

export type ButtonVariant = "primary" | "secondary";

export type ButtonSize = "sm" | "md";

export const buttonClassName = (
    variant: ButtonVariant,
    size: ButtonSize = "md",
) => classNames(styles.root, styles[variant], styles[size]);

export const linkClassName = styles.link;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function Button({
    variant = "primary",
    size = "md",
    className,
    ...rest
}: ButtonProps) {
    return (
        <button
            className={classNames(className, buttonClassName(variant, size))}
            {...rest}
        />
    );
}
