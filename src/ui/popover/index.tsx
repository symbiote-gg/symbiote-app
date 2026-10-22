import {
    autoUpdate,
    flip,
    hide,
    offset,
    shift,
    useFloating,
} from "@floating-ui/react-dom";
import classNames from "classnames";
import type { PointerEvent, ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./styles.module.css";

const GAP = 8;
const MARGIN = 8;

export type PopoverPlacement = "side" | "top" | "bottom" | "left";
export type PopoverAlign = "start" | "end";

const stop = (e: PointerEvent<HTMLDivElement>) => e.stopPropagation();

export interface PopoverProps {
    anchor: HTMLElement | null;
    placement?: PopoverPlacement;
    align?: PopoverAlign;
    compact?: boolean;
    interactive?: boolean;
    id?: string;
    role?: string;
    "aria-label"?: string;
    className?: string;
    children: ReactNode;
    onPointerEnter?: () => void;
    onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
}

export function Popover({
    anchor,
    placement = "side",
    align = "start",
    compact,
    interactive = true,
    id,
    role,
    "aria-label": ariaLabel,
    className,
    children,
    onPointerEnter,
    onPointerLeave,
}: PopoverProps) {
    const { refs, floatingStyles, isPositioned, middlewareData } = useFloating({
        elements: { reference: anchor },
        placement:
            placement === "side"
                ? align === "start"
                    ? "right-start"
                    : "right-end"
                : placement,
        strategy: "fixed",
        middleware: [
            offset(GAP),
            flip({ padding: MARGIN }),
            shift({ padding: MARGIN }),
            hide(),
        ],
        whileElementsMounted: autoUpdate,
    });

    const hidden = !isPositioned || middlewareData.hide?.referenceHidden;

    return createPortal(
        <div
            ref={refs.setFloating}
            id={id}
            role={role}
            aria-label={ariaLabel}
            className={classNames(
                styles.panel,
                compact ? styles.compact : styles.regular,
                { [styles.passive]: !interactive },
                className,
            )}
            style={
                hidden
                    ? { ...floatingStyles, visibility: "hidden" }
                    : floatingStyles
            }
            onPointerDown={interactive ? stop : undefined}
            onPointerMove={interactive ? stop : undefined}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            {children}
        </div>,
        document.body,
    );
}
