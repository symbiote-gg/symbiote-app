import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { AwardPills, GameIcon, HeroPortrait, Kad } from "@/components";
import { Tooltip, Typography } from "@/ui";
import { STATS, type Stat } from "../stats";

import styles from "./styles.module.css";

const TIERS = [1, 2, 3, 4, 5, 6, 7];
const TIER_LEVELS = [1, 4, 7, 10, 13, 16, 20];

export interface PlayerRowProps {
    player: ReplayPlayerDetail;
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
}: PlayerRowProps) {
    const t = useTranslations("replay");

    return (
        <div
            className={classNames(className, styles.root, {
                [styles.owner]: owner,
            })}
        >
            <span className={styles.hero}>
                <HeroPortrait
                    name={player.heroName}
                    portrait={player.heroPortrait}
                    size="md"
                    className={classNames(
                        styles.portrait,
                        ally ? styles.ally : styles.enemy,
                    )}
                />
                <span className={styles.playerText}>
                    <span className={styles.playerName}>
                        <Typography weight="semibold" truncate>
                            {player.name}
                        </Typography>
                        <AwardPills awards={player.awards} />
                    </span>
                    <Typography size="xs" variant="secondary" truncate>
                        {player.heroName}
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

                    const name = talent.name ?? talent.talentId;

                    return (
                        <Tooltip
                            key={tier}
                            content={name}
                            description={t("talentLevel", {
                                level: TIER_LEVELS[tier - 1],
                            })}
                        >
                            <GameIcon
                                category="abilitytalents"
                                icon={talent.icon}
                                label={name}
                                className={styles.talent}
                            />
                        </Tooltip>
                    );
                })}
            </span>
            <Typography
                size="sm"
                variant="secondary"
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
            {STATS.map(({ stat, wide, plain }) => {
                const value = player[stat] ?? 0;
                const max = maxByStat[stat];
                const top = !plain && max > 0 && value === max;

                return (
                    <span
                        key={stat}
                        className={classNames(styles.statCell, {
                            [styles.wide]: wide,
                            [styles.top]: top,
                            [styles.allyBar]: ally,
                            [styles.enemyBar]: !ally,
                        })}
                    >
                        {!plain && value > 0 && (
                            <span
                                className={styles.bar}
                                style={{ width: `${(value / max) * 100}%` }}
                            />
                        )}
                        <Typography
                            size="sm"
                            mono
                            noWrap
                            weight={top ? "semibold" : "regular"}
                            variant={top ? "primary" : "secondary"}
                            className={styles.statValue}
                        >
                            {formatStat(player[stat])}
                        </Typography>
                    </span>
                );
            })}
        </div>
    );
}
