import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { ReplaySort, ReplaySortColumn } from "@/api/replays";
import { TableHead } from "@/ui";

import columns from "../replay-row/columns.module.css";
import styles from "./styles.module.css";

const COLUMNS = [
    { key: "game", className: columns.game },
    { key: "teams", className: columns.teams },
    { key: "mode", className: classNames(columns.col, columns.mode) },
    { key: "kad", className: classNames(columns.col, columns.kad) },
    { key: "heroDamage", className: classNames(columns.col, columns.damage) },
    { key: "gameTime", className: classNames(columns.col, columns.duration) },
    { key: "played", className: columns.time },
    { key: "result", className: columns.result },
] as const;

const SORTABLE: readonly string[] = [
    "heroDamage",
    "gameTime",
    "played",
] satisfies ReplaySortColumn[];

export interface ReplayListHeaderProps {
    wide?: boolean;
    sort?: ReplaySort;
    onSortChange?: (sort: ReplaySort) => void;
}

export function ReplayListHeader({
    wide,
    sort,
    onSortChange,
}: ReplayListHeaderProps) {
    const t = useTranslations("replayRow.columns");

    const onSort = (key: string) => {
        const column = key as ReplaySortColumn;
        onSortChange?.({
            column,
            desc: sort?.column === column ? !sort.desc : true,
        });
    };

    return (
        <div
            className={classNames(columns.row, styles.root, {
                [columns.wide]: wide,
            })}
        >
            <TableHead
                className={columns.inner}
                columns={COLUMNS.map(({ key, className }) => ({
                    key,
                    label: t(key),
                    className,
                    sortable: SORTABLE.includes(key),
                }))}
                sort={sort && { key: sort.column, desc: sort.desc }}
                onSort={onSortChange && onSort}
            />
        </div>
    );
}
