import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Typography } from "@/ui";
import { HeaderText } from "../../../timeline/popover/header/header-text";
import { Gauge, GaugeValue } from "../../../timeline/popover/parts/gauge";
import { sideClasses } from "../../../timeline/side";
import type { RoleStat, StatComparison } from "../../role-performances";
import { SidePortrait } from "../../side-portrait";

import styles from "./styles.module.css";

interface PerHeroProps {
    icon: LucideIcon;
    comparison: StatComparison;
    label: string;
    ally: ReplayPlayerDetail[];
    enemy: ReplayPlayerDetail[];
    ownerId: number;
    formatValue: (stat: RoleStat, value: number | null) => string;
}

export function PerHero({
    icon: Icon,
    comparison: { stat, better },
    label,
    ally,
    enemy,
    ownerId,
    formatValue,
}: PerHeroProps) {
    const t = useTranslations("replay.rolePerformances");

    const heroes = [
        ...ally.map((player) => ({ player, side: "ally" as const })),
        ...enemy.map((player) => ({ player, side: "enemy" as const })),
    ];
    const max = Math.max(0, ...heroes.map(({ player }) => player[stat] ?? 0));

    return (
        <>
            <header className={styles.header}>
                <Icon
                    className={classNames(styles.icon, sideClasses(better))}
                    aria-hidden
                />
                <HeaderText
                    title={label}
                    tag={t("statResult", { side: better ?? "none" })}
                    tagClassName={classNames(sideClasses(better))}
                    meta={t("perHeroMeta", {
                        ally: ally.length,
                        enemy: enemy.length,
                    })}
                />
            </header>
            <div className={styles.rows}>
                {heroes.map(({ player, side }) => {
                    const value = player[stat] ?? 0;

                    return (
                        <div
                            key={player.playerId}
                            className={classNames(
                                styles.row,
                                sideClasses(side),
                            )}
                        >
                            <SidePortrait
                                player={player}
                                side={side}
                                owner={player.playerId === ownerId}
                                size="sm"
                            />
                            <Gauge
                                percent={max > 0 ? (value / max) * 100 : 0}
                                faded={better !== null && better !== side}
                            />
                            <GaugeValue>
                                <Typography size="xs" weight="semibold" mono>
                                    {formatValue(stat, player[stat])}
                                </Typography>
                            </GaugeValue>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
