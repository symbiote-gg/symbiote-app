import classNames from "classnames";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { MouseEvent } from "react";

import { Eyebrow } from "../eyebrow";

import styles from "./styles.module.css";

export interface TableColumn {
    key: string;
    label: string;
    className?: string;
    sortable?: boolean;
}

export interface TableSort {
    key: string;
    desc: boolean;
}

export interface TableHeadProps {
    columns: TableColumn[];
    strip?: boolean;
    sort?: TableSort;
    onSort?: (key: string) => void;
    className?: string;
}

export function TableHead({
    columns,
    strip,
    sort,
    onSort,
    className,
}: TableHeadProps) {
    const onSortClick = (e: MouseEvent<HTMLButtonElement>) =>
        onSort?.(e.currentTarget.value);

    const SortedIcon = sort?.desc ? ChevronDown : ChevronUp;

    return (
        <div
            className={classNames(className, styles.root, {
                [styles.strip]: strip,
            })}
        >
            {columns.map(({ key, label, className, sortable }) => {
                const sorted = sort?.key === key;
                const SortIcon = sorted ? SortedIcon : ChevronsUpDown;
                return (
                    <Eyebrow
                        key={key}
                        noWrap
                        className={classNames(className, {
                            [styles.sorted]: sorted,
                        })}
                    >
                        {sortable && onSort ? (
                            <button
                                type="button"
                                value={key}
                                className={styles.sort}
                                onClick={onSortClick}
                            >
                                {label}
                                <SortIcon
                                    aria-hidden
                                    className={classNames(styles.icon, {
                                        [styles.unsorted]: !sorted,
                                    })}
                                />
                            </button>
                        ) : (
                            label
                        )}
                    </Eyebrow>
                );
            })}
        </div>
    );
}
