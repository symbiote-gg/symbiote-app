import { type CSSProperties, useRef } from "react";
import { useTranslations } from "use-intl";
import { Link } from "wouter";

import type { HeroSummary } from "@/api/heroes";
import { HeroPortrait } from "@/components";
import { type AppearCheck, useAppear } from "@/hooks/useAppear";
import { usePrefetchHero } from "@/hooks/usePrefetchHero";
import { Typography, WinRate } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface HeroCardProps {
    hero: HeroSummary;
    appear?: AppearCheck;
}

export function HeroCard({ hero, appear }: HeroCardProps) {
    const t = useTranslations("heroes.card");
    const roles = useTranslations("roles");
    const ref = useRef<HTMLAnchorElement>(null);
    const { onPointerEnter, onPointerLeave } = usePrefetchHero(hero.heroId);

    useAppear(ref, appear, "card", {
        glow: styles.portrait,
        sweep: styles.sweep,
    });

    const rate = winRate(hero.wins, hero.losses);
    const neutral = !isJudged(hero.wins, hero.losses);

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
            onPointerLeave={onPointerLeave}
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
                        <Typography size="sm" variant="secondary" truncate>
                            {roles(hero.role)}
                        </Typography>
                    )}
                </div>
                <div className={styles.result}>
                    {rate !== null && (
                        <Typography as="span" display className={styles.pct}>
                            <WinRate rate={rate} judged={!neutral} />
                        </Typography>
                    )}
                    <Typography as="span" size="sm" variant="secondary">
                        {t("games", { count: hero.games })}
                    </Typography>
                </div>
            </div>
        </Link>
    );
}
