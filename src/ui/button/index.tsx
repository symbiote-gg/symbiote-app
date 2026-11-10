import classNames from "classnames";
import type { ButtonHTMLAttributes } from "react";

import {
    type ButtonSize,
    type ButtonVariant,
    buttonClassName,
} from "./class-names";

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
