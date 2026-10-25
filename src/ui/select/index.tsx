import classNames from "classnames";
import {
    type MouseEvent,
    type ReactNode,
    useId,
    useRef,
    useState,
} from "react";

import { useFocusOnOpen } from "@/hooks/useFocusOnOpen";
import { Dropdown } from "../dropdown";
import { FilterTrigger } from "../filter-trigger";

import styles from "./styles.module.css";

export interface SelectOption<T extends string> {
    value: T;
    label: string;
    adornment?: ReactNode;
}

export interface SelectProps<T extends string> {
    icon: ReactNode;
    label: string;
    options: readonly SelectOption<T>[];
    /** Null means no filter. */
    value: T | null;
    emptyLabel: string;
    clearLabel: string;
    disabled?: boolean;
    onChange: (value: T | null) => void;
}

export function Select<T extends string>({
    icon,
    label,
    options,
    value,
    emptyLabel,
    clearLabel,
    disabled,
    onChange,
}: SelectProps<T>) {
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const list = useRef<HTMLDivElement>(null);

    useFocusOnOpen(
        open,
        () =>
            list.current?.querySelector<HTMLButtonElement>(
                "[aria-pressed=true]",
            ) ?? list.current?.querySelector("button"),
    );

    const selected = options.find((option) => option.value === value);

    const onToggleOpen = () => setOpen(!open);
    const onClose = () => setOpen(false);
    const onClear = () => onChange(null);

    const onPick = (e: MouseEvent<HTMLButtonElement>) => {
        onChange(e.currentTarget.value as T);
        setOpen(false);
    };

    return (
        <>
            <FilterTrigger
                ref={setAnchor}
                icon={icon}
                label={label}
                value={selected?.label ?? emptyLabel}
                active={value !== null}
                open={open}
                disabled={disabled}
                clearLabel={clearLabel}
                aria-controls={id}
                onClick={onToggleOpen}
                onClear={onClear}
            />
            <Dropdown
                open={open}
                anchor={anchor}
                id={id}
                aria-label={label}
                onClose={onClose}
            >
                <div ref={list} className={styles.list}>
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            value={option.value}
                            aria-pressed={option.value === value}
                            className={classNames(styles.option, {
                                [styles.selected]: option.value === value,
                            })}
                            onClick={onPick}
                        >
                            <span className={styles.label}>
                                {option.label}
                                {option.adornment}
                            </span>
                        </button>
                    ))}
                </div>
            </Dropdown>
        </>
    );
}
