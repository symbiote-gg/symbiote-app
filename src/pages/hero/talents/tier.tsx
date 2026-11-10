import classNames from "classnames";
import { useTranslations } from "use-intl";

import { GameIcon, TalentTooltip } from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Meter, Typography, WinRate } from "@/ui";
import { type Tier, type TierTalent, formatPickRate } from "./tiers";

import styles from "./styles.module.css";

export interface TierColumnProps {
    tier: Tier;
}

export function TierColumn({ tier }: TierColumnProps) {
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
        <li className={styles.talent}>
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
                        framed
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
                            {talent.picks > 0 && (
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
                            )}
                        </span>
                    </span>
                </span>
            </TalentTooltip>
        </li>
    );
}
