import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import { useId, useState } from "react";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Eyebrow, Popover, Typography } from "@/ui";
import {
    type RoleStat,
    type StatComparison,
    type TeamSide,
    barLengths,
} from "../role-performances";
import { PerHero } from "./per-hero";

import styles from "./styles.module.css";

interface StatBarProps {
    icon: LucideIcon;
    comparison: StatComparison;
    ally: ReplayPlayerDetail[];
    enemy: ReplayPlayerDetail[];
    ownerId: number;
    formatValue: (stat: RoleStat, value: number | null) => string;
}

export function StatBar({
    icon,
    comparison,
    ally,
    enemy,
    ownerId,
    formatValue,
}: StatBarProps) {
    const t = useTranslations("replay.rolePerformances");
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
    const [open, setOpen] = useState(false);

    const { stat, better } = comparison;
    const lengths = barLengths(comparison);
    const label = t(`stat.${stat}`);

    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);

    const value = (side: TeamSide) => (
        <Typography
            size="sm"
            mono
            noWrap
            weight={better === side ? "semibold" : "regular"}
            variant={better === side ? "primary" : "tertiary"}
            className={classNames(styles.value, styles[side])}
        >
            {formatValue(stat, comparison[side])}
        </Typography>
    );

    const half = (side: TeamSide) => (
        <span className={classNames(styles.half, styles[side])}>
            <span
                className={classNames(styles.bar, {
                    [styles.trailing]: better !== null && better !== side,
                })}
                style={{ width: `${lengths[side] * 100}%` }}
            />
        </span>
    );

    const row = (
        <span className={styles.row}>
            {value("ally")}
            <span className={styles.trackWrap}>
                <Eyebrow noWrap>{label}</Eyebrow>
                <span className={styles.track}>
                    {half("ally")}
                    {half("enemy")}
                </span>
            </span>
            {value("enemy")}
        </span>
    );

    if (ally.length < 2 && enemy.length < 2) return row;

    return (
        <span
            ref={setAnchor}
            className={styles.trigger}
            tabIndex={0}
            aria-describedby={open ? id : undefined}
            onPointerEnter={onOpen}
            onPointerLeave={onClose}
            onFocus={onOpen}
            onBlur={onClose}
        >
            {row}
            {open && (
                <Popover
                    id={id}
                    role="tooltip"
                    anchor={anchor}
                    placement="top"
                    interactive={false}
                    className={styles.popover}
                >
                    <PerHero
                        icon={icon}
                        comparison={comparison}
                        label={label}
                        ally={ally}
                        enemy={enemy}
                        ownerId={ownerId}
                        formatValue={formatValue}
                    />
                </Popover>
            )}
        </span>
    );
}
