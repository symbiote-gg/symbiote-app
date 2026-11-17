import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { CareerTotals } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Eyebrow, Meter, Stat, Typography, rollingChunks } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { kda } from "@/utils/hero-stats";

import styles from "./styles.module.css";

const hoursAndMinutes = (secs: number) => ({
    hours: Math.floor(secs / 3600),
    minutes: Math.floor((secs % 3600) / 60),
});

const unit = (chunks: ReactNode) => (
    <span className={styles.unit}>{chunks}</span>
);

const alive = (chunks: ReactNode) => (
    <span className={styles.alive}>{chunks}</span>
);

const dead = (chunks: ReactNode) => (
    <span className={styles.dead}>{chunks}</span>
);

export interface TimePanelProps {
    totals: CareerTotals;
    mvps: number;
}

export function TimePanel({ totals, mvps }: TimePanelProps) {
    const t = useTranslations("career");
    const format = useFormatter();
    const { kda: formatKda } = useFormatStat();

    const deadSecs = Math.min(totals.totalTimeDeadSecs, totals.totalDuration);
    const aliveSecs = totals.totalDuration - deadSecs;
    const aliveShare =
        totals.totalDuration > 0 ? aliveSecs / totals.totalDuration : 0;

    return (
        <div className={styles.root}>
            <Eyebrow className={styles.title}>{t("timePlayed")}</Eyebrow>
            <Typography display noWrap className={styles.total}>
                {t.rich("playTime", {
                    ...hoursAndMinutes(totals.totalDuration),
                    num: rollingChunks,
                    unit,
                })}
            </Typography>
            <dl className={styles.stats}>
                <Stat label={t("games")}>{format.number(totals.games)}</Stat>
                {totals.avgDuration !== null && (
                    <Stat label={t("avgGame")}>
                        {formatDuration(totals.avgDuration)}
                    </Stat>
                )}
                <Stat label={t("kda")}>
                    {formatKda(kda(totals.takedowns, totals.deaths))}
                </Stat>
                <Stat
                    label={t("mvps")}
                    valueClassName={mvps > 0 ? styles.mvp : styles.none}
                >
                    {format.number(mvps)}
                </Stat>
            </dl>
            <div className={styles.life}>
                <Meter
                    value={aliveShare}
                    color="accent"
                    track="loss"
                    size="md"
                    className={styles.meter}
                />
                <div className={styles.lifeLabels}>
                    <Typography size="xs" variant="tertiary" noWrap>
                        {t.rich("alive", {
                            time: t("hours", hoursAndMinutes(aliveSecs)),
                            b: alive,
                        })}
                    </Typography>
                    <Typography size="xs" variant="tertiary" noWrap>
                        {t.rich("dead", {
                            time: t("hours", hoursAndMinutes(deadSecs)),
                            b: dead,
                        })}
                    </Typography>
                </div>
            </div>
        </div>
    );
}

export { TimePanelSkeleton } from "./skeleton";
