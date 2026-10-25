import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { TeamSummary } from "@/api/replays";
import { Eyebrow, Typography } from "@/ui";
import { formatDuration } from "@/utils/dates";

import styles from "./styles.module.css";

interface TeamKillsProps {
    ally: TeamSummary;
    enemy: TeamSummary;
    duration: number;
}

interface TeamLabelProps {
    side: "ally" | "enemy";
    summary: TeamSummary;
}

function TeamLabel({ side, summary }: TeamLabelProps) {
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
                {summary.level !== null && (
                    <Typography
                        size="xs"
                        weight="semibold"
                        mono
                        noWrap
                        className={styles.level}
                    >
                        {t.rich("teamKills.level", {
                            level: summary.level,
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
                {t("teamKills.breakdown", {
                    heroes: summary.kills,
                    ai: summary.aiKills,
                })}
            </Typography>
        </div>
    );
}

export function TeamKills({ ally, enemy, duration }: TeamKillsProps) {
    const t = useTranslations("replay");

    return (
        <div className={styles.root}>
            <TeamLabel side="ally" summary={ally} />
            <Typography
                weight="semibold"
                display
                className={classNames(styles.count, styles.ally)}
            >
                {ally.kills + ally.aiKills}
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
                {enemy.kills + enemy.aiKills}
            </Typography>
            <TeamLabel side="enemy" summary={enemy} />
        </div>
    );
}
