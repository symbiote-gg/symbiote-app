import classNames from "classnames";
import type { ReactNode } from "react";
import { Link } from "wouter";

import {
    type ButtonSize,
    type ButtonVariant,
    buttonClassName,
} from "../button";

export interface ButtonLinkProps {
    href: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    arrow?: boolean;
    className?: string;
    children: ReactNode;
}

export function ButtonLink({
    href,
    variant = "primary",
    size = "md",
    arrow = true,
    className,
    children,
}: ButtonLinkProps) {
    return (
        <Link
            href={href}
            className={classNames(className, buttonClassName(variant, size))}
        >
            {children}
            {arrow && <span aria-hidden>→</span>}
        </Link>
    );
}
