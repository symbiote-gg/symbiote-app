import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TableColumn } from "@/ui";
import { STATS } from "./stats";

import styles from "./styles.module.css";

export function useColumns(): TableColumn[] {
    const t = useTranslations("replay");

    return [
        { key: "player", label: t("player") },
        { key: "talents", label: t("talents"), className: styles.talents },
        { key: "kad", label: t("kad"), className: styles.number },
        ...STATS.map(({ stat, label, secondary }) => ({
            key: stat,
            label: t(label),
            className: classNames(styles.number, styles.statHead, {
                [styles.secondary]: secondary,
            }),
        })),
    ];
}
