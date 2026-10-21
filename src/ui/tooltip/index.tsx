import classNames from "classnames";
import { type ReactNode, useId, useState } from "react";

import { Popover } from "../popover";

import styles from "./styles.module.css";

export interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
    const [open, setOpen] = useState(false);

    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);

    return (
        <span
            ref={setAnchor}
            className={classNames(styles.trigger, className)}
            aria-describedby={open ? id : undefined}
            onPointerEnter={onOpen}
            onPointerLeave={onClose}
            onFocus={onOpen}
            onBlur={onClose}
        >
            {children}
            {open && (
                <Popover
                    id={id}
                    role="tooltip"
                    anchor={anchor}
                    placement="top"
                    compact
                    interactive={false}
                >
                    {content}
                </Popover>
            )}
        </span>
    );
}
