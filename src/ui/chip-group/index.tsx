import classNames from "classnames";
import type { MouseEvent, ReactNode } from "react";

import styles from "./styles.module.css";

export interface ChipGroupProps {
    label: string;
    children: ReactNode;
}

export function ChipGroup({ label, children }: ChipGroupProps) {
    return (
        <div role="group" aria-label={label} className={styles.root}>
            {children}
        </div>
    );
}

export function ChipDivider() {
    return <span className={styles.divider} aria-hidden />;
}

export interface ChipButtonProps {
    icon: ReactNode;
    count?: number;
    pressed: boolean;
    /** Purple when pressed, for the chip that means you. */
    accent?: "primary";
    disabled?: boolean;
    value?: string;
    children: ReactNode;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function ChipButton({
    icon,
    count,
    pressed,
    accent,
    disabled,
    value,
    children,
    onClick,
}: ChipButtonProps) {
    return (
        <button
            type="button"
            value={value}
            aria-pressed={pressed}
            disabled={disabled}
            className={classNames(styles.chip, accent && styles[accent], {
                [styles.on]: pressed,
                [styles.off]: !disabled && !pressed,
            })}
            onClick={onClick}
        >
            <span className={styles.icon} aria-hidden>
                {icon}
            </span>
            {children}
            {count !== undefined && (
                <span className={styles.count}>{count}</span>
            )}
        </button>
    );
}
