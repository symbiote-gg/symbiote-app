import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { sideClasses } from "../../side";
import { Difference } from "../difference";
import { type FormatXp, type Source, lead } from "../xp-sources";

import styles from "./styles.module.css";

interface SourceRowProps {
    source: Source;
    ally: number;
    enemy: number;
    max: number;
    formatXp: FormatXp;
}

export function SourceRow({
    source,
    ally,
    enemy,
    max,
    formatXp,
}: SourceRowProps) {
    const t = useTranslations("replay.xpSources");

    const leader = lead(ally, enemy, formatXp);

    const width = (value: number) => `${max === 0 ? 0 : (value / max) * 100}%`;

    return (
        <div className={styles.root}>
            <div className={styles.label}>
                <Typography weight="semibold" noWrap>
                    {t(`sources.${source}.label`)}
                </Typography>
                <Typography size="sm" variant="tertiary" noWrap>
                    {t(`sources.${source}.detail`)}
                </Typography>
            </div>
            <Typography
                size="sm"
                weight="semibold"
                mono
                noWrap
                className={classNames(
                    styles.value,
                    styles.allyValue,
                    sideClasses("ally"),
                )}
            >
                {formatXp(ally)}
            </Typography>
            <span className={classNames(styles.track, styles.allyTrack)}>
                <span
                    className={classNames(styles.fill, sideClasses("ally"), {
                        [styles.trailing]: leader === "enemy",
                    })}
                    style={{ width: width(ally) }}
                />
            </span>
            <span className={styles.track}>
                <span
                    className={classNames(styles.fill, sideClasses("enemy"), {
                        [styles.trailing]: leader === "ally",
                    })}
                    style={{ width: width(enemy) }}
                />
            </span>
            <Typography
                size="sm"
                weight="semibold"
                mono
                noWrap
                className={classNames(styles.value, sideClasses("enemy"))}
            >
                {formatXp(enemy)}
            </Typography>
            <Difference
                ally={ally}
                enemy={enemy}
                leader={leader}
                formatXp={formatXp}
            />
        </div>
    );
}
