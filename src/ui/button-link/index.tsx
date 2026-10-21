import classNames from "classnames";
import type { ReactNode } from "react";
import { Link } from "wouter";

import { type ButtonVariant, buttonClassName } from "../button";

export interface ButtonLinkProps {
    href: string;
    variant?: ButtonVariant;
    className?: string;
    children: ReactNode;
}

export function ButtonLink({
    href,
    variant = "primary",
    className,
    children,
}: ButtonLinkProps) {
    return (
        <Link
            href={href}
            className={classNames(className, buttonClassName(variant))}
        >
            {children}
            <span aria-hidden>→</span>
        </Link>
    );
}
