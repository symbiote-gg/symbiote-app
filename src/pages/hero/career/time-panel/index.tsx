import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Eyebrow, Meter, Stat, Typography } from "@/ui";
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
    hero: HeroDetail;
}

export function TimePanel({ hero }: TimePanelProps) {
    const t = useTranslations("hero.career");
    const format = useFormatter();
    const { kda: formatKda } = useFormatStat();

    const deadSecs = Math.min(hero.totalTimeDeadSecs, hero.totalDuration);
    const aliveSecs = hero.totalDuration - deadSecs;
    const aliveShare =
        hero.totalDuration > 0 ? aliveSecs / hero.totalDuration : 0;

    const mvps = hero.awards.find((award) => award.type === "mvp")?.count ?? 0;

    return (
        <div className={styles.root}>
            <Eyebrow className={styles.title}>{t("timePlayed")}</Eyebrow>
            <Typography display noWrap className={styles.total}>
                {t.rich("playTime", {
                    ...hoursAndMinutes(hero.totalDuration),
                    unit,
                })}
            </Typography>
            <dl className={styles.stats}>
                <Stat label={t("games")}>{format.number(hero.games)}</Stat>
                {hero.avgDuration !== null && (
                    <Stat label={t("avgGame")}>
                        {formatDuration(hero.avgDuration)}
                    </Stat>
                )}
                <Stat label={t("kda")}>
                    {formatKda(kda(hero.takedowns, hero.deaths))}
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
