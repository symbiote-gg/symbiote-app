import classNames from "classnames";
import { type ReactNode, type SyntheticEvent, useId, useState } from "react";

import { Popover, type PopoverPlacement } from "../popover";
import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface TooltipProps {
    content: ReactNode;
    description?: ReactNode;
    compact?: boolean;
    placement?: PopoverPlacement;
    children: ReactNode;
    className?: string;
    panelClassName?: string;
}

export function Tooltip({
    content,
    description,
    compact = true,
    placement = "top",
    children,
    className,
    panelClassName,
}: TooltipProps) {
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);

    const onOpen = (e: SyntheticEvent<HTMLSpanElement>) =>
        setAnchor(e.currentTarget);
    const onClose = () => setAnchor(null);

    const body = description ? (
        <>
            <Typography size="xs" weight="semibold">
                {content}
            </Typography>
            <Typography size="xs" variant="tertiary">
                {description}
            </Typography>
        </>
    ) : typeof content === "string" ? (
        <Typography size="xs">{content}</Typography>
    ) : (
        content
    );

    return (
        <span
            className={classNames(styles.trigger, className)}
            aria-describedby={anchor ? id : undefined}
            onPointerEnter={onOpen}
            onPointerLeave={onClose}
            onFocus={onOpen}
            onBlur={onClose}
        >
            {children}
            {anchor && (
                <Popover
                    id={id}
                    role="tooltip"
                    anchor={anchor}
                    placement={placement}
                    compact={compact}
                    interactive={false}
                    className={panelClassName}
                >
                    {body}
                </Popover>
            )}
        </span>
    );
}
