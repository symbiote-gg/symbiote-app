import { openUrl } from "@tauri-apps/plugin-opener";
import type { MouseEvent, ReactNode } from "react";

import { type ButtonVariant, buttonClassName, linkClassName } from "@/ui";

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
        variant === "link"
            ? linkClassName
            : variant === "chip"
              ? styles.chip
              : buttonClassName(variant);

    return (
        <a href={href} className={className} onClick={onClick}>
            {children}
        </a>
    );
}
