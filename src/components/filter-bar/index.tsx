import { Trash } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/ui";

import styles from "./styles.module.css";

// A single filter clears from its own trigger.
const RESET_FROM = 2;

export interface FilterBarProps {
    label: string;
    active: number;
    resetLabel: string;
    onReset: () => void;
    children: ReactNode;
}

export function FilterBar({
    label,
    active,
    resetLabel,
    onReset,
    children,
}: FilterBarProps) {
    return (
        <div role="group" aria-label={label} className={styles.root}>
            <div className={styles.filters}>{children}</div>
            {active >= RESET_FROM && (
                <Button
                    variant="secondary"
                    size="sm"
                    className={styles.reset}
                    onClick={onReset}
                >
                    <Trash aria-hidden />
                    {resetLabel}
                </Button>
            )}
        </div>
    );
}
