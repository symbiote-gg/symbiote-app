import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Typography } from "@/ui";

import styles from "./styles.module.css";

interface EmptyProps {
    icon: LucideIcon;
    tone: "muted" | "win";
    title: string;
    description: string;
    children?: ReactNode;
}

export function Empty({
    icon: Icon,
    tone,
    title,
    description,
    children,
}: EmptyProps) {
    return (
        <div className={styles.empty}>
            <span className={classNames(styles.emptyIcon, styles[tone])}>
                <Icon className={styles.emptyIconGlyph} aria-hidden />
            </span>
            <Typography size="lg" weight="semibold">
                {title}
            </Typography>
            <Typography variant="tertiary">{description}</Typography>
            {children}
        </div>
    );
}
