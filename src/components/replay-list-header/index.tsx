import classNames from "classnames";
import { useTranslations } from "use-intl";

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

export interface ReplayListHeaderProps {
    wide?: boolean;
}

export function ReplayListHeader({ wide }: ReplayListHeaderProps) {
    const t = useTranslations("replayRow.columns");

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
                }))}
            />
        </div>
    );
}
