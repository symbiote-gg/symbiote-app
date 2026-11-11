import classNames from "classnames";
import { Sword, Tombstone } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { HeroPlayerName, TeamPortrait } from "@/components";
import { StatTile, Typography, sideClasses } from "@/ui";
import type { Roster } from "@/utils/timeline/roster";
import type { TopSlot } from "../../kill-log/kill-log";
import type { RangeStats } from "../stats";

import styles from "./styles.module.css";

const ally = (chunks: ReactNode) => (
    <span className={classNames(styles.team, sideClasses("ally"))}>
        {chunks}
    </span>
);

const enemy = (chunks: ReactNode) => (
    <span className={classNames(styles.team, sideClasses("enemy"))}>
        {chunks}
    </span>
);

const versus = (chunks: ReactNode) => (
    <Typography as="span" size="sm" variant="tertiary">
        {chunks}
    </Typography>
);

interface TopKillerProps {
    killer: TopSlot | null;
    roster: Roster;
}

function TopKiller({ killer, roster }: TopKillerProps) {
    return (
        <span className={styles.topKiller}>
            {killer ? (
                <>
                    <TeamPortrait
                        slot={killer.slot}
                        size="xs"
                        roster={roster}
                    />
                    <HeroPlayerName slot={killer.slot} roster={roster} inline />
                </>
            ) : (
                "-"
            )}
        </span>
    );
}

interface SummaryProps {
    stats: RangeStats;
    roster: Roster;
}

export function Summary({ stats, roster }: SummaryProps) {
    const t = useTranslations("replay.deathMap");

    return (
        <div className={styles.root}>
            <StatTile
                variant="panel"
                icon={Tombstone}
                label={t("stats.deaths")}
                className={styles.wide}
                value={t.rich("stats.score", {
                    allyDeaths: stats.ally,
                    enemyDeaths: stats.enemy,
                    ally,
                    enemy,
                    versus,
                })}
            />
            <StatTile
                variant="panel"
                icon={Sword}
                label={t("stats.teamTopKiller")}
                value={<TopKiller killer={stats.allyKiller} roster={roster} />}
            />
            <StatTile
                variant="panel"
                icon={Sword}
                label={t("stats.enemyTopKiller")}
                value={<TopKiller killer={stats.enemyKiller} roster={roster} />}
            />
        </div>
    );
}
