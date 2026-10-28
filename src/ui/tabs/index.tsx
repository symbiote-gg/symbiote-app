import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";

import styles from "./styles.module.css";

export interface TabItem<T extends string> {
    value: T;
    label: ReactNode;
    href: string;
    icon?: LucideIcon;
}

export interface TabsProps<T extends string> {
    label: string;
    items: readonly TabItem<T>[];
    value: T;
    // Enables number keys 1..n and shows them as a hint after this label.
    shortcutsLabel?: string;
    className?: string;
}

const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function Tabs<T extends string>({
    label,
    items,
    value,
    shortcutsLabel,
    className,
}: TabsProps<T>) {
    const [, navigate] = useLocation();

    useEffect(() => {
        if (!shortcutsLabel) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey)
                return;
            if (isTyping(e.target)) return;

            const item = items[Number(e.key) - 1];
            if (!item || item.value === value) return;

            navigate(item.href, { replace: true });
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [shortcutsLabel, items, value, navigate]);

    return (
        <nav aria-label={label} className={classNames(styles.root, className)}>
            {items.map(({ icon: Icon, ...item }) => (
                <Link
                    key={item.value}
                    href={item.href}
                    replace
                    aria-current={item.value === value ? "page" : undefined}
                    className={classNames(styles.tab, {
                        [styles.active]: item.value === value,
                    })}
                >
                    {Icon && <Icon className={styles.icon} aria-hidden />}
                    {item.label}
                </Link>
            ))}
            {shortcutsLabel && (
                <div className={styles.hint} aria-hidden>
                    {shortcutsLabel}
                    {items.map((item, index) => (
                        <kbd key={item.value} className={styles.key}>
                            {index + 1}
                        </kbd>
                    ))}
                </div>
            )}
        </nav>
    );
}
