import classNames from "classnames";
import { CpuAi } from "lucide-react";

import styles from "./styles.module.css";

export interface AiPortraitProps {
    label?: string;
    className?: string;
}

export function AiPortrait({ label, className }: AiPortraitProps) {
    return (
        <span
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={classNames(className, styles.root)}
        >
            <CpuAi className={styles.icon} aria-hidden />
        </span>
    );
}
