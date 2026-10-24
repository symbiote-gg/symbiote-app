import classNames from "classnames";
import type { ReactNode } from "react";

import { useDismiss } from "@/hooks/useDismiss";
import { Popover } from "../popover";

import styles from "./styles.module.css";

export interface DropdownProps {
    open: boolean;
    anchor: HTMLElement | null;
    id?: string;
    role?: string;
    "aria-label"?: string;
    className?: string;
    children: ReactNode;
    onClose: () => void;
}

export function Dropdown({
    open,
    anchor,
    id,
    role = "dialog",
    "aria-label": ariaLabel,
    className,
    children,
    onClose,
}: DropdownProps) {
    useDismiss(open, anchor, onClose);

    if (!open) return null;

    return (
        <Popover
            anchor={anchor}
            placement="bottom-start"
            bare
            id={id}
            role={role}
            aria-label={ariaLabel}
            className={classNames(styles.root, className)}
        >
            {children}
        </Popover>
    );
}
