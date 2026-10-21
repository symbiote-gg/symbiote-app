import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";

import columns from "../replay-row/columns.module.css";
import styles from "./styles.module.css";

const COLUMNS = [
    { key: "game", className: columns.game },
    { key: "mode", className: classNames(columns.col, columns.mode) },
    { key: "kda", className: classNames(columns.col, columns.kda) },
    { key: "heroDamage", className: classNames(columns.col, columns.damage) },
    { key: "length", className: classNames(columns.col, columns.duration) },
    { key: "played", className: columns.time },
    { key: "result", className: columns.result },
] as const;

export function ReplayListHeader() {
    const t = useTranslations("replayRow.columns");

    return (
        <div className={classNames(columns.row, styles.root)}>
            <div className={columns.inner}>
                {COLUMNS.map(({ key, className }) => (
                    <Typography
                        key={key}
                        size="xs"
                        variant="secondary"
                        uppercase
                        noWrap
                        className={classNames(className, styles.heading)}
                    >
                        {t(key)}
                    </Typography>
                ))}
            </div>
        </div>
    );
}
