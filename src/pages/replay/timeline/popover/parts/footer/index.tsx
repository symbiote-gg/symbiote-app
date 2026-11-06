import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography, sideClasses } from "@/ui";
import type { Side } from "@/utils/timeline/types";

import styles from "./styles.module.css";

interface FooterProps {
    side: Side;
    children: ReactNode;
}

export function Footer({ side, children }: FooterProps) {
    return (
        <div className={classNames(styles.footer, sideClasses(side))}>
            {children}
        </div>
    );
}

interface FooterImpactProps {
    strong: boolean;
    children: ReactNode;
}

export function FooterImpact({ strong, children }: FooterImpactProps) {
    return (
        <Typography
            size="xs"
            variant={strong ? "primary" : "tertiary"}
            weight={strong ? "semibold" : undefined}
            className={classNames({ [styles.strong]: strong })}
        >
            {children}
        </Typography>
    );
}
