import { Search, X } from "lucide-react";
import {
    type ChangeEvent,
    type MouseEvent,
    type ReactNode,
    useEffect,
    useId,
    useRef,
    useState,
} from "react";

import { linkClassName } from "../button";
import { CheckboxBox } from "../checkbox";
import { Dropdown } from "../dropdown";
import { Eyebrow } from "../eyebrow";
import { FilterTrigger } from "../filter-trigger";
import { Typography } from "../typography";
import { findMatch } from "./match";

import styles from "./styles.module.css";

export interface ComboboxOption<T extends string | number> {
    value: T;
    label: string;
}

export interface ComboboxProps<
    T extends string | number,
    O extends ComboboxOption<T>,
> {
    icon: ReactNode;
    label: string;
    valueLabel: string;
    clearLabel: string;
    placeholder: string;
    sectionLabel?: string;
    clearSearchLabel: string;
    options: readonly O[];
    value: readonly T[];
    disabled?: boolean;
    renderOption: (option: O, label: ReactNode) => ReactNode;
    removeLabel: (label: string) => string;
    noResults: (query: string) => ReactNode;
    /** Shown while searching. */
    footer: (results: number) => ReactNode;
    onChange: (value: T[]) => void;
}

function Highlighted({
    label,
    range,
}: {
    label: string;
    range: [number, number];
}) {
    const [start, end] = range;
    if (start === end) return label;
    const chars = Array.from(label);
    return (
        <>
            {chars.slice(0, start).join("")}
            <mark className={styles.mark}>
                {chars.slice(start, end).join("")}
            </mark>
            {chars.slice(end).join("")}
        </>
    );
}

export function Combobox<
    T extends string | number,
    O extends ComboboxOption<T>,
>({
    icon,
    label,
    valueLabel,
    clearLabel,
    placeholder,
    sectionLabel,
    clearSearchLabel,
    options,
    value,
    disabled,
    renderOption,
    removeLabel,
    noResults,
    footer,
    onChange,
}: ComboboxProps<T, O>) {
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const input = useRef<HTMLInputElement>(null);

    const results = options.flatMap((option) => {
        const range = findMatch(option.label, query);
        return range ? [{ option, range }] : [];
    });
    const picked = value.flatMap((picked) => {
        const option = options.find((option) => option.value === picked);
        return option ? [option] : [];
    });

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => input.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open]);

    const toggle = (picked: T) =>
        onChange(
            value.includes(picked)
                ? value.filter((value) => value !== picked)
                : [...value, picked],
        );

    const onToggleOpen = () => {
        setOpen(!open);
        setQuery("");
    };
    const onClose = () => setOpen(false);

    const onQueryChange = (e: ChangeEvent<HTMLInputElement>) =>
        setQuery(e.currentTarget.value);

    const onClearSearch = () => {
        setQuery("");
        input.current?.focus();
    };

    const onClear = () => onChange([]);

    const onOptionClick = (e: MouseEvent<HTMLDivElement>) => {
        toggle(results[Number(e.currentTarget.dataset.index)].option.value);
        input.current?.focus();
    };

    const onRemove = (e: MouseEvent<HTMLButtonElement>) => {
        const removed = picked[Number(e.currentTarget.dataset.index)];
        onChange(value.filter((value) => value !== removed.value));
        input.current?.focus();
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
                className={styles.panel}
                onClose={onClose}
            >
                <div className={styles.head}>
                    <label className={styles.search}>
                        <Search className={styles.searchIcon} aria-hidden />
                        <input
                            ref={input}
                            type="text"
                            role="combobox"
                            aria-expanded
                            aria-controls={`${id}-listbox`}
                            aria-autocomplete="list"
                            placeholder={placeholder}
                            value={query}
                            autoComplete="off"
                            spellCheck={false}
                            className={styles.input}
                            onChange={onQueryChange}
                        />
                    </label>
                    {picked.length > 0 && (
                        <div className={styles.chips}>
                            {picked.map((option, index) => (
                                <span
                                    key={option.value}
                                    className={styles.chip}
                                >
                                    {option.label}
                                    <button
                                        type="button"
                                        data-index={index}
                                        aria-label={removeLabel(option.label)}
                                        className={styles.remove}
                                        onClick={onRemove}
                                    >
                                        <X aria-hidden />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div
                    id={`${id}-listbox`}
                    role="listbox"
                    aria-multiselectable
                    aria-label={label}
                    className={styles.list}
                >
                    {sectionLabel && !query && results.length > 0 && (
                        <Eyebrow className={styles.section}>
                            {sectionLabel}
                        </Eyebrow>
                    )}
                    {results.map(({ option, range }, index) => {
                        const selected = value.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                role="option"
                                aria-selected={selected}
                                data-index={index}
                                className={styles.option}
                                onClick={onOptionClick}
                            >
                                <CheckboxBox checked={selected} />
                                {renderOption(
                                    option,
                                    <Highlighted
                                        label={option.label}
                                        range={range}
                                    />,
                                )}
                            </div>
                        );
                    })}
                    {results.length === 0 && query && (
                        <Typography
                            size="sm"
                            variant="tertiary"
                            className={styles.empty}
                        >
                            {noResults(query.trim())}
                        </Typography>
                    )}
                </div>
                {query && (
                    <footer className={styles.footer}>
                        {results.length === 0 ? (
                            <button
                                type="button"
                                className={linkClassName}
                                onClick={onClearSearch}
                            >
                                {clearSearchLabel}
                            </button>
                        ) : (
                            footer(results.length)
                        )}
                    </footer>
                )}
            </Dropdown>
        </>
    );
}
