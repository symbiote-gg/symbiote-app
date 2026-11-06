import classNames from "classnames";
import { Search, X } from "lucide-react";
import { type ChangeEvent, useRef } from "react";

import styles from "./styles.module.css";

export interface SearchInputProps {
    value: string;
    label: string;
    placeholder: string;
    clearLabel: string;
    className?: string;
    onChange: (value: string) => void;
}

export function SearchInput({
    value,
    label,
    placeholder,
    clearLabel,
    className,
    onChange,
}: SearchInputProps) {
    const input = useRef<HTMLInputElement>(null);

    const onInputChange = (e: ChangeEvent<HTMLInputElement>) =>
        onChange(e.target.value);

    // The × unmounts once the search is cleared, so focus would fall to the body.
    const onClear = () => {
        onChange("");
        input.current?.focus();
    };

    return (
        <label
            className={classNames(className, styles.root, {
                [styles.active]: value.length > 0,
            })}
        >
            <Search className={styles.icon} aria-hidden />
            <input
                ref={input}
                type="search"
                aria-label={label}
                placeholder={placeholder}
                value={value}
                autoComplete="off"
                spellCheck={false}
                className={styles.input}
                onChange={onInputChange}
            />
            {value.length > 0 && (
                <button
                    type="button"
                    aria-label={clearLabel}
                    className={styles.clear}
                    onClick={onClear}
                >
                    <X aria-hidden />
                </button>
            )}
        </label>
    );
}
