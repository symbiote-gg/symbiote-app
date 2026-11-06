import classNames from "classnames";
import type { ReactNode } from "react";

import { sideClasses } from "@/ui";
import type { Side } from "@/utils/timeline/types";

import styles from "./styles.module.css";

interface PanelProps {
    side: Side;
    className?: string;
    children: ReactNode;
}

/** The team-tinted block a popover variant puts its details in. */
export function Panel({ side, className, children }: PanelProps) {
    return (
        <div className={classNames(className, styles.panel, sideClasses(side))}>
            {children}
        </div>
    );
}
