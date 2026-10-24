import classNames from "classnames";
import { ChevronDown, X } from "lucide-react";
import {
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
    type Ref,
    useCallback,
    useRef,
} from "react";

import styles from "./styles.module.css";

export interface FilterTriggerProps {
    icon: ReactNode;
    label: string;
    value: string;
    active?: boolean;
    open?: boolean;
    disabled?: boolean;
    clearLabel?: string;
    "aria-controls"?: string;
    ref?: Ref<HTMLButtonElement>;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    onClear?: () => void;
}

export function FilterTrigger({
    icon,
    label,
    value,
    active,
    open,
    disabled,
    clearLabel,
    "aria-controls": ariaControls,
    ref,
    onClick,
    onClear,
}: FilterTriggerProps) {
    const button = useRef<HTMLButtonElement | null>(null);

    const clearable = !!active && !disabled && !!onClear;

    // Stable, so the `ref` callback isn't detached and reattached on every render.
    const setButton = useCallback(
        (element: HTMLButtonElement | null) => {
            button.current = element;
            if (typeof ref === "function") ref(element);
            else if (ref) ref.current = element;
        },
        [ref],
    );

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key !== "Backspace" || !clearable) return;
        e.preventDefault();
        onClear?.();
    };

    // The × unmounts once the filter is cleared, so focus would fall to the body.
    const onClearClick = () => {
        onClear?.();
        button.current?.focus();
    };

    return (
        <span
            className={classNames(styles.root, {
                [styles.active]: active,
                [styles.open]: open,
                [styles.disabled]: disabled,
            })}
        >
            <button
                ref={setButton}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={open ? ariaControls : undefined}
                disabled={disabled}
                className={styles.trigger}
                onClick={onClick}
                onKeyDown={onKeyDown}
            >
                <span className={styles.icon} aria-hidden>
                    {icon}
                </span>
                <span className={styles.label}>{label}</span>
                <span className={styles.value}>{value}</span>
                {!clearable && (
                    <ChevronDown className={styles.chevron} aria-hidden />
                )}
            </button>
            {clearable && (
                <button
                    type="button"
                    aria-label={clearLabel}
                    className={styles.clear}
                    onClick={onClearClick}
                >
                    <X aria-hidden />
                </button>
            )}
        </span>
    );
}
