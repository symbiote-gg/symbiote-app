import classNames from "classnames";
import type { ReactNode } from "react";

import styles from "./styles.module.css";

export interface PageProps {
    fill?: boolean;
    width?: "fluid" | "reading";
    children: ReactNode;
}

export function Page({ fill, width = "fluid", children }: PageProps) {
    return (
        <div
            className={classNames(styles.root, styles[width], {
                [styles.fill]: fill,
            })}
        >
            {children}
        </div>
    );
}
