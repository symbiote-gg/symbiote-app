import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";

import styles from "./styles.module.css";

export interface Kills {
    heroes: number;
    ai: number;
}

interface TeamKillsProps {
    ally: Kills;
    enemy: Kills;
}

interface TeamLabelProps {
    side: "ally" | "enemy";
    kills: Kills;
}

function TeamLabel({ side, kills }: TeamLabelProps) {
    const t = useTranslations("replay");

    return (
        <div className={classNames(styles.label, styles[side])}>
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
            <Typography size="xs" variant="secondary" noWrap>
                {t("teamKills.breakdown", { ...kills })}
            </Typography>
        </div>
    );
}

export function TeamKills({ ally, enemy }: TeamKillsProps) {
    const t = useTranslations("replay");

    return (
        <div className={styles.root}>
            <TeamLabel side="ally" kills={ally} />
            <Typography weight="semibold" display className={styles.count}>
                {ally.heroes + ally.ai}
            </Typography>
            <Typography
                size="xs"
                weight="semibold"
                variant="secondary"
                uppercase
                noWrap
                className={styles.title}
            >
                {t("teamKills.title")}
            </Typography>
            <Typography weight="semibold" display className={styles.count}>
                {enemy.heroes + enemy.ai}
            </Typography>
            <TeamLabel side="enemy" kills={enemy} />
        </div>
    );
}
