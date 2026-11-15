import { useTranslations } from "use-intl";

import type { HeroScoreRow } from "@/api/stats";
import { HeroPortrait } from "@/components";
import { Chip, Tooltip, Typography } from "@/ui";
import { TIERS, tierIndex } from "../tiers";
import { HeroesHeader, TierLabel } from "./tier-label";

import styles from "./styles.module.css";

// Under half, most of the comparison is against the hero's role.
const THIN_HERO_WEIGHT = 0.5;

export interface HeroTiersProps {
    heroes: HeroScoreRow[];
}

export function HeroTiers({ heroes }: HeroTiersProps) {
    const t = useTranslations("profile.score");

    const groups = TIERS.map(() => [] as HeroScoreRow[]);

    heroes.forEach((hero) => groups[tierIndex(hero.score)].push(hero));
    groups.forEach((group) => group.sort((a, b) => b.score - a.score));

    const compared = (hero: HeroScoreRow) =>
        t(hero.heroWeight < THIN_HERO_WEIGHT ? "comparedThin" : "compared", {
            count: hero.heroSamples,
            hero: hero.name,
        });

    const chip = (hero: HeroScoreRow) => (
        <Tooltip
            key={hero.heroId}
            content={compared(hero)}
            className={styles.chipAnchor}
        >
            <div className={styles.chip}>
                <HeroPortrait
                    name={hero.name}
                    portrait={hero.portrait}
                    size="md"
                    className={styles.portrait}
                />
                <div className={styles.names}>
                    <div className={styles.name}>
                        <Typography size="sm" weight="semibold" truncate>
                            {hero.name}
                        </Typography>
                        {hero.heroWeight < THIN_HERO_WEIGHT && (
                            <Chip size="sm" uppercase>
                                {t("heroes.fewGames")}
                            </Chip>
                        )}
                    </div>
                    <Typography size="sm" variant="tertiary" truncate>
                        {t("heroes.games", { count: hero.games })}
                    </Typography>
                </div>
                <Typography
                    size="xl2"
                    weight="semibold"
                    mono
                    className={styles.score}
                >
                    {hero.score}
                </Typography>
            </div>
        </Tooltip>
    );

    return (
        <div className={styles.root}>
            <HeroesHeader />
            <ul className={styles.tiers}>
                {TIERS.map((_, index) => {
                    const tier = TIERS.length - 1 - index;
                    const group = groups[tier];

                    return (
                        <TierLabel
                            key={tier}
                            index={tier}
                            filled={group.length > 0}
                        >
                            {group.length > 0 ? (
                                group.map(chip)
                            ) : (
                                <Typography size="sm" variant="tertiary">
                                    {t("heroes.empty")}
                                </Typography>
                            )}
                        </TierLabel>
                    );
                })}
            </ul>
        </div>
    );
}
