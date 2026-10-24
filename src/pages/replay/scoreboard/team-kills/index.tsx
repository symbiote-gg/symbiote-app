import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Eyebrow, Typography } from "@/ui";
import { formatDuration } from "@/utils/dates";

import styles from "./styles.module.css";

export interface Kills {
    heroes: number;
    ai: number;
}

interface TeamKillsProps {
    ally: Kills;
    enemy: Kills;
    allyLevel: number | null;
    enemyLevel: number | null;
    duration: number;
}

interface TeamLabelProps {
    side: "ally" | "enemy";
    kills: Kills;
    level: number | null;
}

function TeamLabel({ side, kills, level }: TeamLabelProps) {
    const t = useTranslations("replay");

    return (
        <div className={classNames(styles.label, styles[side])}>
            <div className={styles.heading}>
                <Typography
                    size="lg"
                    weight="semibold"
                    display
                    uppercase
                    noWrap
                    className={styles.team}
                >
                    {t("team", { side })}
                </Typography>
                {level !== null && (
                    <Typography
                        size="xs"
                        weight="semibold"
                        mono
                        noWrap
                        className={styles.level}
                    >
                        {t.rich("teamKills.level", {
                            level,
                            label: (chunks) => (
                                <span className={styles.levelLabel}>
                                    {chunks}
                                </span>
                            ),
                        })}
                    </Typography>
                )}
            </div>
            <Typography size="xs" variant="tertiary" noWrap>
                {t("teamKills.breakdown", { ...kills })}
            </Typography>
        </div>
    );
}

export function TeamKills({
    ally,
    enemy,
    allyLevel,
    enemyLevel,
    duration,
}: TeamKillsProps) {
    const t = useTranslations("replay");

    return (
        <div className={styles.root}>
            <TeamLabel side="ally" kills={ally} level={allyLevel} />
            <Typography
                weight="semibold"
                display
                className={classNames(styles.count, styles.ally)}
            >
                {ally.heroes + ally.ai}
            </Typography>
            <div className={styles.center}>
                <Eyebrow noWrap className={styles.title}>
                    {t("teamKills.title")}
                </Eyebrow>
                <Typography size="xs" variant="tertiary" mono noWrap>
                    {formatDuration(duration)}
                </Typography>
            </div>
            <Typography
                weight="semibold"
                display
                className={classNames(styles.count, styles.enemy)}
            >
                {enemy.heroes + enemy.ai}
            </Typography>
            <TeamLabel side="enemy" kills={enemy} level={enemyLevel} />
        </div>
    );
}
