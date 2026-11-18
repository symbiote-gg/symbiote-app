import classNames from "classnames";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroScoreRow } from "@/api/stats";
import { HeroPortrait } from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Chip, Meter, Typography } from "@/ui";
import { GemIcon } from "../score-card/gem";
import { TIERS, rankTone, tierIndex } from "../score-card/tiers";
import { pillarTone } from "../score-card/tones";
import { THIN_HERO_WEIGHT } from "./swarm";

import styles from "./styles.module.css";

export interface HeroPanelProps {
    hero: HeroScoreRow;
    hideHeader?: boolean;
}

export function HeroPanel({ hero, hideHeader }: HeroPanelProps) {
    const t = useTranslations("profile.score");
    const { percent } = useFormatStat();

    const thin = hero.heroWeight < THIN_HERO_WEIGHT;
    const { rank, tier } = TIERS[tierIndex(hero.score)];

    const pillars = [...hero.pillars].sort(
        (a, b) => b.percentile - a.percentile,
    );

    return (
        <div className={styles.panel} style={rankTone(rank)}>
            {!hideHeader && (
                <div className={styles.panelHeader}>
                    <HeroPortrait
                        name={hero.name}
                        portrait={hero.portrait}
                        size="lg"
                        className={styles.portrait}
                    />
                    <div className={styles.identity}>
                        <Typography size="lg" weight="semibold" truncate>
                            {hero.name}
                        </Typography>
                        <Chip
                            size="sm"
                            tone="rank"
                            leading={
                                <GemIcon
                                    className={styles.panelGem}
                                    aria-hidden
                                />
                            }
                        >
                            {t(`tier.${tier}`)}
                        </Chip>
                    </div>
                    <Typography
                        as="span"
                        size="xl2"
                        weight="semibold"
                        mono
                        className={classNames(
                            styles.panelScore,
                            styles.rankText,
                        )}
                    >
                        {hero.score}
                    </Typography>
                </div>
            )}
            <ul className={styles.pillars}>
                {pillars.map((pillar) => (
                    <li
                        key={pillar.id}
                        className={styles.pillar}
                        style={pillarTone(pillar.id)}
                    >
                        <span className={styles.pillarName}>
                            <span className={styles.pillarDot} />
                            <Typography as="span" noWrap>
                                {t(`pillar.${pillar.id}`)}
                            </Typography>
                        </span>
                        <Meter
                            value={pillar.percentile}
                            color="accent"
                            className={styles.pillarMeter}
                        />
                        <Typography
                            as="span"
                            weight="semibold"
                            mono
                            noWrap
                            className={styles.pillarPoints}
                        >
                            {percent(pillar.percentile)}
                        </Typography>
                    </li>
                ))}
            </ul>
            <div className={styles.panelFooter}>
                <Typography as="span" size="sm" variant="tertiary" mono noWrap>
                    {t("heroes.gamesCount", { count: hero.games })}
                </Typography>
                <span className={styles.pool}>
                    {thin && (
                        <TriangleAlert
                            className={styles.poolIcon}
                            aria-hidden
                        />
                    )}
                    <Typography as="span" size="sm" variant="tertiary">
                        {t(thin ? "heroes.smallPool" : "heroes.pool", {
                            count: hero.heroSamples,
                        })}
                    </Typography>
                </span>
            </div>
        </div>
    );
}
