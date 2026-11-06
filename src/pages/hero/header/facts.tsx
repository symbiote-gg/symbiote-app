import { useTranslations } from "use-intl";

import type { HeroDetail } from "@/api/heroes";
import { Typography, WinRate } from "@/ui";
import { usePlayedDay } from "@/utils/dates";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface FactsProps {
    hero: HeroDetail;
}

export function Facts({ hero }: FactsProps) {
    const t = useTranslations("hero.facts");
    const playedDay = usePlayedDay();

    const bestMap = hero.maps
        .filter((map) => isJudged(map.wins, map.losses))
        .map((map) => ({ ...map, rate: winRate(map.wins, map.losses) ?? 0 }))
        .sort((a, b) => b.rate - a.rate || b.games - a.games)[0];

    if (!bestMap && !hero.ally && !hero.lastPlayed) return null;

    return (
        <dl className={styles.facts}>
            {bestMap && (
                <div className={styles.fact}>
                    <Typography as="dt" size="sm" variant="tertiary">
                        {t("bestMap")}
                    </Typography>
                    <Typography as="dd" size="sm" weight="semibold" noWrap>
                        {bestMap.name}
                    </Typography>
                    <Typography as="dd" size="xs" mono>
                        <WinRate rate={bestMap.rate} />
                    </Typography>
                </div>
            )}
            {hero.ally && (
                <div className={styles.fact}>
                    <Typography as="dt" size="sm" variant="tertiary">
                        {t("mostPlayedWith")}
                    </Typography>
                    <Typography as="dd" size="sm" weight="semibold" noWrap>
                        {hero.ally.name}
                    </Typography>
                    <Typography as="dd" size="xs" variant="tertiary" mono>
                        {t("allyGames", { count: hero.ally.games })}
                    </Typography>
                </div>
            )}
            {hero.lastPlayed && (
                <div className={styles.fact}>
                    <Typography as="dt" size="sm" variant="tertiary">
                        {t("lastPlayed")}
                    </Typography>
                    <Typography as="dd" size="sm" weight="semibold" noWrap>
                        {playedDay(hero.lastPlayed)}
                    </Typography>
                </div>
            )}
        </dl>
    );
}
