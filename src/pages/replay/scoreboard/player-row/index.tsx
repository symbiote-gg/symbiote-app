import classNames from "classnames";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { AwardPill, GameIcon, HeroPortrait } from "@/components";
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
    const mvp = player.awards.some((a) => a.type === "mvp");

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
                    highlight={mvp}
                />
                <span className={styles.playerText}>
                    <span className={styles.playerName}>
                        <Typography weight="semibold" truncate>
                            {player.name}
                        </Typography>
                        {player.awards.map((award) => (
                            <AwardPill key={award.type} award={award} />
                        ))}
                    </span>
                    <Typography size="xs" variant="secondary" truncate>
                        {player.heroName}
                    </Typography>
                </span>
            </span>
            <Typography
                size="sm"
                variant="secondary"
                mono
                noWrap
                className={classNames(styles.number, styles.kda)}
            >
                {player.kills === null ? (
                    "-"
                ) : (
                    <>
                        <span className={styles.kills}>{player.kills}</span>/
                        {player.assists ?? 0}/
                        <span
                            className={
                                player.deaths ? styles.deaths : styles.deathless
                            }
                        >
                            {player.deaths ?? 0}
                        </span>
                    </>
                )}
            </Typography>
            {STATS.map(({ stat, wide }) => {
                const value = player[stat] ?? 0;
                const max = maxByStat[stat];
                const top = max > 0 && value === max;

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
                        {value > 0 && (
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
                            content={
                                <>
                                    <Typography size="xs" weight="semibold">
                                        {name}
                                    </Typography>
                                    <Typography size="xs" variant="secondary">
                                        {t("talentLevel", {
                                            level: TIER_LEVELS[tier - 1],
                                        })}
                                    </Typography>
                                </>
                            }
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
        </div>
    );
}
