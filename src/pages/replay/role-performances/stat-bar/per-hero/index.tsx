import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Typography } from "@/ui";
import { HeaderText } from "../../../timeline/popover/header/header-text";
import { Gauge, GaugeValue } from "../../../timeline/popover/parts/gauge";
import { sideClasses } from "../../../timeline/side";
import {
    type RoleStat,
    type StatComparison,
    barLength,
} from "../../role-performances";
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
    const values = heroes
        .map(({ player }) => player[stat])
        .filter((value) => value !== null);

    // Best first: barLength already inverts lower-is-better stats.
    const rows = heroes
        .map((hero) => {
            const value = hero.player[stat];

            return {
                ...hero,
                value,
                length: value === null ? null : barLength(stat, value, values),
            };
        })
        .sort((a, b) => (b.length ?? -1) - (a.length ?? -1));

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
                {rows.map(({ player, side, value, length }) => (
                    <div
                        key={player.playerId}
                        className={classNames(styles.row, sideClasses(side))}
                    >
                        <SidePortrait
                            player={player}
                            side={side}
                            owner={player.playerId === ownerId}
                            size="sm"
                        />
                        <Gauge
                            percent={(length ?? 0) * 100}
                            faded={better !== null && better !== side}
                        />
                        <GaugeValue>
                            <Typography size="xs" weight="semibold" mono>
                                {formatValue(stat, value)}
                            </Typography>
                        </GaugeValue>
                    </div>
                ))}
            </div>
        </>
    );
}
