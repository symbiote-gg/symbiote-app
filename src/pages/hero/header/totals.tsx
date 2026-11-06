import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Eyebrow, Meter, Stat, Typography, WinRate } from "@/ui";
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
        <dl className={styles.stats}>
            {rate !== null && (
                <div>
                    <Eyebrow as="dt">{t("winRate")}</Eyebrow>
                    <dd className={styles.rateLine}>
                        <Typography as="span" display className={styles.rate}>
                            <WinRate rate={rate} judged={!neutral} />
                        </Typography>
                        <Meter
                            value={rate}
                            neutral={neutral}
                            className={styles.meter}
                        />
                    </dd>
                </div>
            )}
            <Stat label={t("games")} valueClassName={styles.value}>
                {hero.games}
            </Stat>
            <Stat label={t("playTime")} valueClassName={styles.value}>
                {t("hours", {
                    hours: Math.floor(hero.totalDuration / 3600),
                    minutes: Math.floor((hero.totalDuration % 3600) / 60),
                })}
            </Stat>
            <Stat label={t("kda")} valueClassName={styles.value}>
                {formatKda(kda(hero.takedowns, hero.deaths))}
            </Stat>
            <Stat
                label={t("mvps")}
                valueClassName={classNames(styles.value, styles.mvp)}
            >
                {mvps}
            </Stat>
            {hero.avgDuration !== null && (
                <Stat label={t("gameTime")} valueClassName={styles.value}>
                    {formatDuration(hero.avgDuration)}
                </Stat>
            )}
        </dl>
    );
}
