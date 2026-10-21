import { openUrl } from "@tauri-apps/plugin-opener";
import type { MouseEvent, ReactNode } from "react";

import { type ButtonVariant, buttonClassName } from "@/ui";

import styles from "./styles.module.css";

export interface ExternalLinkProps {
    href: string;
    variant?: "link" | "chip" | ButtonVariant;
    children: ReactNode;
}

export function ExternalLink({
    href,
    variant = "link",
    children,
}: ExternalLinkProps) {
    const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        openUrl(href);
    };

    const className =
        variant === "link" || variant === "chip"
            ? styles[variant]
            : buttonClassName(variant);

    return (
        <a href={href} className={className} onClick={onClick}>
            {children}
        </a>
    );
}
