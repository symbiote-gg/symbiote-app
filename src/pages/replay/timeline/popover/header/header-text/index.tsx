import classNames from "classnames";
import type { ReactNode } from "react";

import { Typography } from "@/ui";

import styles from "./styles.module.css";

export interface HeaderTextProps {
    title: ReactNode;
    tag?: ReactNode;
    tagClassName?: string;
    meta: ReactNode;
    metaEnd?: ReactNode;
}

export function HeaderText({
    title,
    tag,
    tagClassName,
    meta,
    metaEnd,
}: HeaderTextProps) {
    return (
        <div className={styles.headerText}>
            <div className={styles.headerTitle}>
                <Typography size="base" weight="semibold" truncate>
                    {title}
                </Typography>
                {tag && (
                    <Typography
                        size="xs"
                        weight="semibold"
                        uppercase
                        noWrap
                        className={classNames(styles.headerTag, tagClassName)}
                    >
                        {tag}
                    </Typography>
                )}
            </div>
            <div className={styles.headerMeta}>
                <Typography size="xs" variant="secondary" mono>
                    {meta}
                </Typography>
                {metaEnd && (
                    <Typography size="xs" variant="secondary" noWrap>
                        {metaEnd}
                    </Typography>
                )}
            </div>
        </div>
    );
}
