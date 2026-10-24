import classNames from "classnames";
import { Check } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";

import styles from "./styles.module.css";

export interface CheckboxProps {
    checked: boolean;
    disabled?: boolean;
    value?: string;
    className?: string;
    children: ReactNode;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function Checkbox({
    checked,
    disabled,
    value,
    className,
    children,
    onChange,
}: CheckboxProps) {
    return (
        <label
            className={classNames(styles.root, className, {
                [styles.disabled]: disabled,
            })}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                value={value}
                className={styles.input}
                onChange={onChange}
            />
            <CheckboxBox checked={checked} disabled={disabled} />
            {children}
        </label>
    );
}

export interface CheckboxBoxProps {
    checked: boolean;
    disabled?: boolean;
}

export function CheckboxBox({ checked, disabled }: CheckboxBoxProps) {
    return (
        <span
            className={classNames(styles.box, {
                [styles.on]: checked,
                [styles.boxDisabled]: disabled,
            })}
            aria-hidden
        >
            {checked && <Check />}
        </span>
    );
}
