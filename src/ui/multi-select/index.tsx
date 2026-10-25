import {
    type ChangeEvent,
    type ReactNode,
    useId,
    useRef,
    useState,
} from "react";

import { useFocusOnOpen } from "@/hooks/useFocusOnOpen";
import { Checkbox } from "../checkbox";
import { Dropdown } from "../dropdown";
import { FilterTrigger } from "../filter-trigger";

import styles from "./styles.module.css";

export interface MultiSelectOption<T extends string> {
    value: T;
    label: string;
    disabled?: boolean;
}

export interface MultiSelectProps<T extends string> {
    icon: ReactNode;
    label: string;
    valueLabel: string;
    clearLabel: string;
    options: readonly MultiSelectOption<T>[];
    /** Empty means no filter. */
    value: readonly T[];
    disabled?: boolean;
    onChange: (value: T[]) => void;
}

export function MultiSelect<T extends string>({
    icon,
    label,
    valueLabel,
    clearLabel,
    options,
    value,
    disabled,
    onChange,
}: MultiSelectProps<T>) {
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const list = useRef<HTMLDivElement>(null);

    useFocusOnOpen(
        open,
        () =>
            list.current?.querySelector<HTMLInputElement>(
                "input:checked:not(:disabled)",
            ) ?? list.current?.querySelector("input:not(:disabled)"),
    );

    const onToggleOpen = () => setOpen(!open);
    const onClose = () => setOpen(false);
    const onClear = () => onChange([]);

    const onToggle = (e: ChangeEvent<HTMLInputElement>) => {
        const picked = e.currentTarget.value as T;
        const next = new Set(value);
        if (next.has(picked)) next.delete(picked);
        else next.add(picked);
        onChange(
            options
                .map((option) => option.value)
                .filter((option) => next.has(option)),
        );
    };

    return (
        <>
            <FilterTrigger
                ref={setAnchor}
                icon={icon}
                label={label}
                value={valueLabel}
                active={value.length > 0}
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
                        <Checkbox
                            key={option.value}
                            value={option.value}
                            checked={value.includes(option.value)}
                            disabled={option.disabled}
                            onChange={onToggle}
                        >
                            <span className={styles.name}>{option.label}</span>
                        </Checkbox>
                    ))}
                </div>
            </Dropdown>
        </>
    );
}
