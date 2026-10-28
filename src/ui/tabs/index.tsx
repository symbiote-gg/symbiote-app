import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "wouter";

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
    className?: string;
}

export function Tabs<T extends string>({
    label,
    items,
    value,
    className,
}: TabsProps<T>) {
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
        </nav>
    );
}
