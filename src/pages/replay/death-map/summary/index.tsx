import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { TeamPortrait } from "@/components";
import { StatTile, Typography } from "@/ui";
import { type Roster, heroName, playerOf } from "@/utils/timeline/roster";
import type { TopSlot } from "../../kill-log/kill-log";
import type { RangeStats } from "../stats";

import styles from "./styles.module.css";

const ally = (chunks: ReactNode) => (
    <span className={styles.ally}>{chunks}</span>
);

const enemy = (chunks: ReactNode) => (
    <span className={styles.enemy}>{chunks}</span>
);

const versus = (chunks: ReactNode) => (
    <Typography as="span" variant="tertiary" display>
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
                    <span className={styles.names}>
                        <Typography
                            as="span"
                            size="sm"
                            weight="semibold"
                            noWrap
                        >
                            {heroName(roster, killer.slot)}
                        </Typography>
                        <Typography
                            as="span"
                            size="sm"
                            variant="tertiary"
                            truncate
                        >
                            {playerOf(roster, killer.slot)?.name}
                        </Typography>
                    </span>
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
                label={t("stats.deaths")}
                value={t.rich("stats.score", {
                    allyDeaths: stats.ally,
                    enemyDeaths: stats.enemy,
                    ally,
                    enemy,
                    versus,
                })}
            />
            <StatTile
                label={t("stats.teamTopKiller")}
                value={<TopKiller killer={stats.allyKiller} roster={roster} />}
            />
            <StatTile
                label={t("stats.enemyTopKiller")}
                value={<TopKiller killer={stats.enemyKiller} roster={roster} />}
            />
        </div>
    );
}
