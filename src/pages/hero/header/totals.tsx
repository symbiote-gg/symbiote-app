import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Stat, WinRate } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { isJudged, kda, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface TotalsProps {
    hero: HeroDetail;
}

export function Totals({ hero }: TotalsProps) {
    const t = useTranslations("hero.totals");
    const { kda: formatKda } = useFormatStat();

    const rate = winRate(hero.wins, hero.losses);
    const neutral = !isJudged(hero.wins, hero.losses);
    const mvps = hero.awards.find((award) => award.type === "mvp")?.count ?? 0;

    return (
        <dl className={styles.panel}>
            {rate !== null && (
                <Stat label={t("winRate")} className={styles.stat}>
                    <WinRate rate={rate} judged={!neutral} />
                </Stat>
            )}
            <Stat label={t("games")} className={styles.stat}>
                {hero.games}
            </Stat>
            <Stat label={t("playTime")} className={styles.stat}>
                {t("hours", {
                    hours: Math.floor(hero.totalDuration / 3600),
                    minutes: Math.floor((hero.totalDuration % 3600) / 60),
                })}
            </Stat>
            <Stat label={t("kda")} className={styles.stat}>
                {formatKda(kda(hero.takedowns, hero.deaths))}
            </Stat>
            <Stat
                label={t("mvps")}
                className={styles.stat}
                valueClassName={styles.mvp}
            >
                {mvps}
            </Stat>
            {hero.avgDuration !== null && (
                <Stat label={t("gameTime")} className={styles.stat}>
                    {formatDuration(hero.avgDuration)}
                </Stat>
            )}
        </dl>
    );
}
