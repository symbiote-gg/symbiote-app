import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Chip } from "@/ui";
import { sideClasses } from "../../side";
import type { FormatXp, Leader } from "../xp-sources";

import styles from "./styles.module.css";

interface DifferenceProps {
    ally: number;
    enemy: number;
    leader: Leader;
    formatXp: FormatXp;
}

export function Difference({ ally, enemy, leader, formatXp }: DifferenceProps) {
    const t = useTranslations("replay.xpSources");

    return (
        <span className={styles.root}>
            {leader === null ? (
                <Chip size="sm">{t("even")}</Chip>
            ) : (
                <Chip
                    size="sm"
                    tone="side"
                    className={classNames(sideClasses(leader))}
                >
                    {formatXp(ally - enemy, true)}
                </Chip>
            )}
        </span>
    );
}
