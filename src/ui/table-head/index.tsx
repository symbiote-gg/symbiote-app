import classNames from "classnames";

import { Typography } from "../typography";

import styles from "./styles.module.css";

export interface TableColumn {
    key: string;
    label: string;
    className?: string;
}

export interface TableHeadProps {
    columns: TableColumn[];
    strip?: boolean;
    className?: string;
}

export function TableHead({ columns, strip, className }: TableHeadProps) {
    return (
        <div
            className={classNames(className, styles.root, {
                [styles.strip]: strip,
            })}
        >
            {columns.map(({ key, label, className }) => (
                <Typography
                    key={key}
                    size="xs"
                    weight="semibold"
                    variant="tertiary"
                    uppercase
                    noWrap
                    className={className}
                >
                    {label}
                </Typography>
            ))}
        </div>
    );
}
