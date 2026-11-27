import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Link } from "wouter";

import type { HeroScoreRow, SessionHero } from "@/api/stats";
import { HeroPortrait, SessionDelta } from "@/components";
import { usePrefetchHero } from "@/hooks/usePrefetchHero";
import { TIERS, rankTone, tierIndex } from "@/pages/profile/score-card/tiers";
import { isMain } from "@/pages/profile/score-heroes/swarm";
import { Eyebrow, Skeleton, Typography, WinRate } from "@/ui";
import { isJudged, sessionRateChange, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

const num = (chunks: ReactNode) => chunks;

const win = (chunks: ReactNode) => <span className={styles.win}>{chunks}</span>;

const loss = (chunks: ReactNode) => (
    <span className={styles.loss}>{chunks}</span>
);

export interface HeroTileProps {
    hero: SessionHero;
    score: HeroScoreRow | undefined;
    scoring: boolean;
}

export function HeroTile({ hero, score, scoring }: HeroTileProps) {
    const t = useTranslations("home.session");
    const career = useTranslations("career");
    const { onPointerEnter, onPointerLeave } = usePrefetchHero(hero.heroId);

    const rateChange = sessionRateChange(
        hero.careerWins,
        hero.careerLosses,
        hero.careerSessionWins,
        hero.careerSessionLosses,
    );
    const rated = score && isMain(score) ? score : null;
    const rank = rated && rankTone(TIERS[tierIndex(rated.score)].rank);

    const accent = hero.accent
        ? ({ "--hero-accent": hero.accent } as CSSProperties)
        : undefined;

    return (
        <li>
            <Link
                href={`/heroes/${hero.heroId}`}
                className={styles.tile}
                style={accent}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
            >
                <HeroPortrait
                    name={hero.name}
                    portrait={hero.portrait}
                    size="lg"
                    className={styles.portrait}
                />
                <div className={styles.names}>
                    <Typography size="lg" weight="semibold" truncate>
                        {hero.name}
                    </Typography>
                    <Typography size="sm" mono>
                        {career.rich("record", {
                            wins: hero.wins,
                            losses: hero.losses,
                            num,
                            win,
                            loss,
                        })}
                    </Typography>
                </div>

                <div className={styles.figure}>
                    <Eyebrow noWrap>{t("winRate")}</Eyebrow>
                    <div className={styles.value}>
                        <Typography as="span" display className={styles.number}>
                            <WinRate
                                rate={winRate(
                                    hero.careerWins,
                                    hero.careerLosses,
                                )}
                                judged={isJudged(
                                    hero.careerWins,
                                    hero.careerLosses,
                                )}
                            />
                        </Typography>
                        {rateChange !== null && (
                            <SessionDelta value={rateChange} unit="percent" />
                        )}
                    </div>
                </div>

                <div className={styles.figure} style={rank ?? undefined}>
                    <Eyebrow noWrap>{t("heroScore")}</Eyebrow>
                    <div className={styles.value}>
                        <Typography
                            as="span"
                            display
                            className={rank ? styles.ranked : styles.number}
                        >
                            {scoring ? (
                                <Skeleton className={styles.scoreBar} />
                            ) : (
                                (rated?.score ?? "-")
                            )}
                        </Typography>
                        {!!rated?.sessionChange && (
                            <SessionDelta
                                value={rated.sessionChange}
                                unit="points"
                            />
                        )}
                    </div>
                </div>
            </Link>
        </li>
    );
}
