import { TriangleAlert } from "lucide-react";
import { useTranslations } from "use-intl";

import { useProfileScore } from "@/hooks/useProfileScore";
import { GemIcon } from "@/pages/profile/score-card/gem";
import { TIERS, rankTone, tierIndex } from "@/pages/profile/score-card/tiers";
import { HeroPanel } from "@/pages/profile/score-heroes/hero-panel";
import { THIN_HERO_WEIGHT, isMain } from "@/pages/profile/score-heroes/swarm";
import { Chip, RollingNumber, Tooltip, Typography } from "@/ui";
import { ScoreSkeleton } from "./skeleton";

import styles from "./styles.module.css";

export interface HeroScoreProps {
    heroId: number;
    hero: string;
}

export function HeroScore({ heroId, hero }: HeroScoreProps) {
    const t = useTranslations("hero.score");
    const tiers = useTranslations("profile.score.tier");
    const { data, isPending } = useProfileScore("all");

    if (isPending) return <ScoreSkeleton />;

    const row = data?.heroes.find((entry) => entry.heroId === heroId);
    if (!row || !isMain(row)) return null;

    const { rank, tier } = TIERS[tierIndex(row.score)];
    const thin = row.heroWeight < THIN_HERO_WEIGHT;

    return (
        <div className={styles.score} style={rankTone(rank)}>
            <Tooltip
                content={<HeroPanel hero={row} hideHeader />}
                compact={false}
                placement="right"
                className={styles.scoreTrigger}
                panelClassName={styles.popover}
            >
                <Typography
                    as="span"
                    display
                    tabIndex={0}
                    className={styles.value}
                >
                    <RollingNumber value={String(row.score)} />
                    <span className={styles.suffix}>{t("suffix")}</span>
                </Typography>
            </Tooltip>
            <div className={styles.meta}>
                <Chip
                    tone="rank"
                    leading={<GemIcon className={styles.gem} aria-hidden />}
                >
                    {tiers(tier)}
                </Chip>
                {thin && (
                    <TriangleAlert className={styles.poolIcon} aria-hidden />
                )}
                <Typography as="span" variant="tertiary">
                    {t(thin ? "smallPool" : "pool", {
                        count: row.heroSamples,
                        hero,
                    })}
                </Typography>
            </div>
        </div>
    );
}
