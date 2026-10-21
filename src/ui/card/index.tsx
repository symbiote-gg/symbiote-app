import classNames from "classnames";
import type { ReactNode } from "react";

import styles from "./styles.module.css";

export interface CardProps {
    className?: string;
    children: ReactNode;
}

export function Card({ className, children }: CardProps) {
    return (
        <section className={classNames(className, styles.root)}>
            {children}
        </section>
    );
}

export * from "./body";
export * from "./header";
