import classNames from "classnames";
import type { MouseEvent, ReactNode } from "react";

import styles from "./styles.module.css";

export interface SegmentedOption<T extends string> {
    value: T;
    label: ReactNode;
    hint?: ReactNode;
}

export interface SegmentedProps<T extends string> {
    label: string;
    options: readonly SegmentedOption<T>[];
    value: T;
    disabled?: boolean;
    fill?: boolean;
    onChange: (value: T) => void;
}

export function Segmented<T extends string>({
    label,
    options,
    value,
    disabled,
    fill,
    onChange,
}: SegmentedProps<T>) {
    const onClick = (e: MouseEvent<HTMLButtonElement>) =>
        onChange(e.currentTarget.value as T);

    return (
        <div
            role="group"
            aria-label={label}
            className={classNames(styles.root, { [styles.fill]: fill })}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    value={option.value}
                    aria-pressed={option.value === value}
                    disabled={disabled}
                    className={classNames(styles.option, {
                        [styles.selected]: option.value === value,
                    })}
                    onClick={onClick}
                >
                    {option.label}
                    {option.hint !== undefined && (
                        <span className={styles.hint}>{option.hint}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
