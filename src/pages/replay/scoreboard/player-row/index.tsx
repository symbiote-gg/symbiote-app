import classNames from "classnames";
import { CircleChevronUp, UserRoundGroup } from "lucide-react";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import {
    AwardPills,
    GameIcon,
    HeroPortrait,
    Kad,
    TalentTooltip,
} from "@/components";
import { Tooltip, Typography } from "@/ui";
import { STATS, type Stat } from "../stats";

import styles from "./styles.module.css";

const TIERS = [1, 2, 3, 4, 5, 6, 7];
const TIER_LEVELS = [1, 4, 7, 10, 13, 16, 20];
const PARTY_COLORS = [
    styles.party1,
    styles.party2,
    styles.party3,
    styles.party4,
];

export interface PlayerRowProps {
    player: ReplayPlayerDetail;
    partyMembers: string[];
    ally: boolean;
    owner: boolean;
    maxByStat: Record<Stat, number>;
    formatStat: (value: number | null) => string;
    className?: string;
}

export function PlayerRow({
    player,
    ally,
    owner,
    maxByStat,
    formatStat,
    className,
    partyMembers,
}: PlayerRowProps) {
    const t = useTranslations("replay");

    return (
        <div
            className={classNames(className, styles.root, {
                [styles.owner]: owner,
            })}
        >
            <span className={styles.hero}>
                <span className={styles.portraitWrap}>
                    <HeroPortrait
                        name={player.heroName}
                        portrait={player.heroPortrait}
                        size="md"
                        className={classNames(
                            styles.portrait,
                            ally ? styles.ally : styles.enemy,
                        )}
                    />
                    {player.party !== null && (
                        <Tooltip
                            content={t("party", {
                                members: partyMembers.join(", "),
                            })}
                            className={classNames(
                                styles.party,
                                PARTY_COLORS[
                                    (player.party - 1) % PARTY_COLORS.length
                                ],
                            )}
                        >
                            <UserRoundGroup />
                        </Tooltip>
                    )}
                </span>
                <span className={styles.playerText}>
                    <span className={styles.playerName}>
                        <Typography weight="semibold" truncate>
                            {player.heroName}
                        </Typography>
                        {player.upvotes > 0 && (
                            <Tooltip content={t("upvotes")}>
                                <span
                                    className={classNames(styles.upvotes, {
                                        [styles.gold]: player.upvotes > 6,
                                        [styles.mythic]: player.upvotes > 3,
                                    })}
                                >
                                    <CircleChevronUp />
                                    <Typography
                                        size="sm"
                                        variant="tertiary"
                                        mono
                                    >
                                        {player.upvotes}
                                    </Typography>
                                </span>
                            </Tooltip>
                        )}
                        <AwardPills awards={player.awards} iconOnlyWhenNarrow />
                    </span>
                    <Typography size="sm" variant="tertiary" truncate>
                        {player.name}
                    </Typography>
                </span>
            </span>
            <span className={styles.icons}>
                {TIERS.map((tier) => {
                    const talent = player.talents.find(
                        (pick) => pick.tier === tier,
                    );
                    if (!talent) {
                        return <span key={tier} className={styles.emptySlot} />;
                    }

                    return (
                        <TalentTooltip
                            key={tier}
                            talent={talent}
                            level={TIER_LEVELS[tier - 1]}
                        >
                            <GameIcon
                                category="abilitytalents"
                                icon={talent.icon}
                                label={talent.name ?? talent.slug}
                                className={styles.talent}
                            />
                        </TalentTooltip>
                    );
                })}
            </span>
            <Typography
                size="sm"
                variant="tertiary"
                mono
                noWrap
                className={styles.number}
            >
                <Kad
                    kills={player.kills}
                    assists={player.assists}
                    deaths={player.deaths}
                />
            </Typography>
            {STATS.map(({ stat, secondary }) => {
                const value = player[stat] ?? 0;
                const max = maxByStat[stat];
                const top = max > 0 && value === max;

                return (
                    <span
                        key={stat}
                        className={classNames(styles.statCell, {
                            [styles.top]: top,
                            [styles.allyBar]: ally,
                            [styles.enemyBar]: !ally,
                            [styles.secondary]: secondary,
                        })}
                    >
                        <Typography
                            size="sm"
                            mono
                            noWrap
                            weight={top ? "semibold" : "regular"}
                            variant={top ? "primary" : "tertiary"}
                        >
                            {formatStat(player[stat])}
                        </Typography>
                        {value > 0 && (
                            <span className={styles.track}>
                                <span
                                    className={styles.bar}
                                    style={{ width: `${(value / max) * 100}%` }}
                                />
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}
