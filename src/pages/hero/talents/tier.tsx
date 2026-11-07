import classNames from "classnames";
import { useTranslations } from "use-intl";

import { GameIcon, TalentTooltip } from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Eyebrow, Meter, Typography, WinRate } from "@/ui";
import { RARE_PICK, type Tier, type TierTalent, formatPickRate } from "./tiers";

import styles from "./styles.module.css";

export interface TierColumnProps {
    tier: Tier;
}

export function TierColumn({ tier }: TierColumnProps) {
    const t = useTranslations("hero.talents");

    return (
        <li className={styles.tier}>
            <div className={styles.head}>
                <span className={styles.badge}>
                    <Typography
                        as="span"
                        size="lg"
                        display
                        className={styles.level}
                    >
                        {tier.level}
                    </Typography>
                </span>
                <Eyebrow as="span">{t("level", { level: tier.level })}</Eyebrow>
            </div>

            <ul className={styles.talents}>
                {tier.talents.map((entry) => (
                    <TalentTile key={entry.talent.talentId} entry={entry} />
                ))}
            </ul>
        </li>
    );
}

interface TalentTileProps {
    entry: TierTalent;
}

function TalentTile({ entry }: TalentTileProps) {
    const t = useTranslations("hero.talents");
    const { percent } = useFormatStat();

    const { talent } = entry;
    const name = talent.name ?? talent.slug;
    const games = t("games", { games: talent.picks });

    return (
        <li
            className={classNames(styles.talent, {
                [styles.rare]: entry.pickRate < RARE_PICK,
            })}
        >
            <TalentTooltip talent={talent} level={entry.level}>
                <span
                    className={classNames(styles.tile, {
                        [styles.top]: entry.top,
                    })}
                >
                    <GameIcon
                        category="abilitytalents"
                        icon={talent.icon}
                        label={name}
                        className={styles.icon}
                    />

                    <span className={styles.info}>
                        <span className={styles.name}>
                            <Typography
                                as="span"
                                size="sm"
                                weight="semibold"
                                truncate
                            >
                                {name}
                            </Typography>
                            <Typography
                                as="span"
                                size="xs"
                                variant="tertiary"
                                mono
                                noWrap
                                aria-label={games}
                                title={games}
                            >
                                {talent.picks}
                            </Typography>
                        </span>
                        <Meter
                            value={entry.pickRate}
                            color={entry.top ? "mvp" : "muted"}
                            className={styles.meter}
                        />
                        <span className={styles.figures}>
                            <Typography
                                as="span"
                                size="xs"
                                variant="tertiary"
                                noWrap
                            >
                                <Typography
                                    as="span"
                                    size="xs"
                                    weight="semibold"
                                    mono
                                >
                                    {formatPickRate(entry, percent)}
                                </Typography>{" "}
                                {t("pick")}
                            </Typography>
                            <Typography
                                as="span"
                                size="xs"
                                variant="tertiary"
                                noWrap
                            >
                                <Typography
                                    as="span"
                                    size="xs"
                                    weight="semibold"
                                    mono
                                >
                                    <WinRate rate={entry.rate} />
                                </Typography>{" "}
                                {t("win")}
                            </Typography>
                        </span>
                    </span>
                </span>
            </TalentTooltip>
        </li>
    );
}
