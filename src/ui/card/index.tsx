import classNames from "classnames";
import type { ReactNode, Ref } from "react";

import styles from "./styles.module.css";

export interface CardProps {
    ref?: Ref<HTMLElement>;
    className?: string;
    children: ReactNode;
}

export function Card({ ref, className, children }: CardProps) {
    return (
        <section ref={ref} className={classNames(className, styles.root)}>
            {children}
        </section>
    );
}

export * from "./body";
export * from "./header";
