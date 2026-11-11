import { type CSSProperties, useRef } from "react";
import { useTranslations } from "use-intl";
import { Link } from "wouter";

import type { HeroSummary } from "@/api/heroes";
import { HeroPortrait } from "@/components";
import { type AppearCheck, useAppear } from "@/hooks/useAppear";
import { useFormatStat } from "@/hooks/useFormatStat";
import { usePrefetchHero } from "@/hooks/usePrefetchHero";
import { Stat, Typography, WinRate } from "@/ui";
import { usePlayedDay } from "@/utils/dates";
import { isJudged, isRated, kda, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface HeroCardProps {
    hero: HeroSummary;
    appear?: AppearCheck;
}

export function HeroCard({ hero, appear }: HeroCardProps) {
    const t = useTranslations("heroes.card");
    const roles = useTranslations("roles");
    const { compact, kda: formatKda } = useFormatStat();
    const playedDay = usePlayedDay();
    const ref = useRef<HTMLAnchorElement>(null);
    const onPointerEnter = usePrefetchHero(hero.heroId);

    useAppear(ref, appear, "card", {
        glow: styles.portrait,
        sweep: styles.sweep,
    });

    const rate = isRated(hero.wins, hero.losses)
        ? winRate(hero.wins, hero.losses)
        : null;
    const neutral = !isJudged(hero.wins, hero.losses);

    const roleStat =
        hero.role === "tank"
            ? { label: t("damageTaken"), value: hero.avgDamageTaken }
            : hero.role === "healer" || hero.role === "support"
              ? { label: t("healing"), value: hero.avgHealing }
              : { label: t("heroDamage"), value: hero.avgHeroDamage };

    const accent = hero.accent
        ? ({ "--hero-accent": hero.accent } as CSSProperties)
        : undefined;

    return (
        <Link
            ref={ref}
            href={`/heroes/${hero.heroId}`}
            className={styles.root}
            style={accent}
            onPointerEnter={onPointerEnter}
        >
            <span className={styles.sweep} aria-hidden />
            <div className={styles.head}>
                <HeroPortrait
                    name={hero.name}
                    portrait={hero.portrait}
                    size="lg"
                    className={styles.portrait}
                />
                <div className={styles.titles}>
                    <Typography size="lg" weight="semibold" truncate>
                        {hero.name}
                    </Typography>
                    {hero.role && (
                        <Typography size="sm" variant="tertiary" truncate>
                            {roles(hero.role)}
                        </Typography>
                    )}
                </div>
                <div className={styles.result}>
                    <Typography as="span" display className={styles.pct}>
                        <WinRate rate={rate} judged={!neutral} />
                    </Typography>
                    <Typography as="span" size="sm" variant="tertiary">
                        {t("games", { count: hero.games })}
                    </Typography>
                </div>
            </div>
            <dl className={styles.stats}>
                <Stat label={t("kda")} size="sm" truncate>
                    {formatKda(kda(hero.takedowns, hero.deaths))}
                </Stat>
                <Stat label={roleStat.label} size="sm" truncate>
                    {compact(roleStat.value, { fixed: true })}
                </Stat>
                <Stat label={t("lastPlayed")} size="sm" mono={false} truncate>
                    {playedDay(hero.lastPlayed)}
                </Stat>
            </dl>
        </Link>
    );
}
