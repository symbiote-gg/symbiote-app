import classNames from "classnames";
import type { ButtonHTMLAttributes } from "react";

import styles from "./styles.module.css";

export type ButtonVariant = "primary" | "secondary";

export const buttonClassName = (variant: ButtonVariant) =>
    classNames(styles.root, styles[variant]);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export function Button({
    variant = "primary",
    className,
    ...rest
}: ButtonProps) {
    return (
        <button
            className={classNames(className, buttonClassName(variant))}
            {...rest}
        />
    );
}
