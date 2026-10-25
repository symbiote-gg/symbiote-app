import classNames from "classnames";
import { Search, X } from "lucide-react";
import {
    type ChangeEvent,
    type MouseEvent,
    type PointerEvent,
    type ReactNode,
    useId,
    useRef,
    useState,
} from "react";

import { useFocusOnOpen } from "@/hooks/useFocusOnOpen";
import { CheckboxBox } from "../checkbox";
import { Dropdown } from "../dropdown";
import { Eyebrow } from "../eyebrow";
import { FilterTrigger } from "../filter-trigger";
import { Typography } from "../typography";
import { matches } from "./match";

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
    options: readonly O[];
    value: readonly T[];
    disabled?: boolean;
    renderOption: (option: O) => ReactNode;
    removeLabel: (label: string) => string;
    noResults: (query: string) => ReactNode;
    onChange: (value: T[]) => void;
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
    options,
    value,
    disabled,
    renderOption,
    removeLabel,
    noResults,
    onChange,
}: ComboboxProps<T, O>) {
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const input = useRef<HTMLInputElement>(null);

    const results = options.filter((option) => matches(option.label, query));
    const picked = value.flatMap((picked) => {
        const option = options.find((option) => option.value === picked);
        return option ? [option] : [];
    });
    const active = Math.min(activeIndex, results.length - 1);
    const optionId = (index: number) => `${id}-option-${index}`;

    useFocusOnOpen(open, () => input.current);

    const toggle = (picked: T) =>
        onChange(
            value.includes(picked)
                ? value.filter((value) => value !== picked)
                : [...value, picked],
        );

    const onToggleOpen = () => {
        setOpen(!open);
        setQuery("");
        setActiveIndex(0);
    };
    const onClose = () => setOpen(false);

    const onQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.currentTarget.value);
        setActiveIndex(0);
    };

    const onClear = () => onChange([]);

    const onOptionClick = (e: MouseEvent<HTMLDivElement>) => {
        toggle(results[Number(e.currentTarget.dataset.index)].value);
        input.current?.focus();
    };

    const onOptionEnter = (e: PointerEvent<HTMLDivElement>) =>
        setActiveIndex(Number(e.currentTarget.dataset.index));

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
                            aria-activedescendant={
                                active >= 0 ? optionId(active) : undefined
                            }
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
                    {results.map((option, index) => {
                        const selected = value.includes(option.value);

                        return (
                            <div
                                key={option.value}
                                id={optionId(index)}
                                role="option"
                                aria-selected={selected}
                                data-index={index}
                                className={classNames(styles.option, {
                                    [styles.active]: index === active,
                                })}
                                onClick={onOptionClick}
                                onPointerEnter={onOptionEnter}
                            >
                                <CheckboxBox checked={selected} />
                                {renderOption(option)}
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
            </Dropdown>
        </>
    );
}
