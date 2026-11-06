import classNames from "classnames";
import { Star } from "lucide-react";
import { useTranslations } from "use-intl";

import type { TalentRecord } from "@/api/heroes";
import { GameIcon, TalentTooltip } from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Meter, Typography, WinRate } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";
import { TIER_LEVELS } from "@/utils/talents";

import styles from "./styles.module.css";

const RARE_PICK = 0.05;

export interface TalentsProps {
    talents: TalentRecord[];
}

export function Talents({ talents }: TalentsProps) {
    const t = useTranslations("hero.talents");

    const tiers = TIER_LEVELS.map((level, index) => {
        const tierTalents = talents.filter(
            (talent) => talent.tier === index + 1,
        );
        const picks = tierTalents.reduce(
            (sum, talent) => sum + talent.picks,
            0,
        );
        const mostPicks = Math.max(
            0,
            ...tierTalents.map((talent) => talent.picks),
        );
        const top = tierTalents.find(
            (talent) => talent.picks > 0 && talent.picks === mostPicks,
        );
        return { level, talents: tierTalents, picks, top };
    }).filter((tier) => tier.talents.length > 0);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Star}
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <ol className={styles.tiers}>
                {tiers.map((tier) => (
                    <li key={tier.level} className={styles.tier}>
                        <Typography
                            as="span"
                            size="xs"
                            variant="tertiary"
                            mono
                            noWrap
                        >
                            {t("level", { level: tier.level })}
                        </Typography>
                        <ul className={styles.talents}>
                            {tier.talents.map((talent) => (
                                <Talent
                                    key={talent.talentId}
                                    talent={talent}
                                    level={tier.level}
                                    tierPicks={tier.picks}
                                    top={talent === tier.top}
                                />
                            ))}
                        </ul>
                    </li>
                ))}
            </ol>
        </Card>
    );
}

interface TalentProps {
    talent: TalentRecord;
    level: number;
    tierPicks: number;
    top: boolean;
}

function Talent({ talent, level, tierPicks, top }: TalentProps) {
    const { percent } = useFormatStat();

    const name = talent.name ?? talent.slug;
    const pickRate = tierPicks === 0 ? 0 : talent.picks / tierPicks;
    const rate = isJudged(talent.wins, talent.losses)
        ? winRate(talent.wins, talent.losses)
        : null;

    return (
        <li
            className={classNames(styles.talent, {
                [styles.rare]: pickRate < RARE_PICK,
            })}
        >
            <TalentTooltip talent={talent} level={level}>
                <GameIcon
                    category="abilitytalents"
                    icon={talent.icon}
                    label={name}
                    className={styles.icon}
                />
            </TalentTooltip>
            <div className={styles.body}>
                <Typography size="sm" weight="semibold" truncate>
                    {name}
                </Typography>
                <div className={styles.pick}>
                    <Meter
                        value={pickRate}
                        color={top ? "accent" : "muted"}
                        className={styles.meter}
                    />
                    <Typography
                        size="xs"
                        variant="tertiary"
                        mono
                        className={styles.pct}
                    >
                        {talent.picks > 0 && pickRate < 0.005
                            ? `<${percent(0.01)}`
                            : percent(pickRate)}
                    </Typography>
                </div>
            </div>
            <Typography
                as="span"
                size="sm"
                weight="semibold"
                mono
                className={styles.win}
            >
                <WinRate rate={rate} />
            </Typography>
        </li>
    );
}
