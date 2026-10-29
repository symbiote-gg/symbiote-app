import classNames from "classnames";
import { Dumbbell } from "lucide-react";
import { Fragment } from "react";
import { useTranslations } from "use-intl";

import type {
    RoleScorePart,
    RoleStat,
    RoleStatColumn,
    RoleUnscoredStat,
} from "@/api/replays";
import { Chip, Eyebrow, Tooltip, Typography } from "@/ui";
import { sideClasses } from "../../side";
import {
    type HeroScore,
    type TeamSide,
    formatScore,
} from "../role-performances";

import styles from "./styles.module.css";

interface SidedScore {
    hero: HeroScore;
    side: TeamSide;
}

const isBest = (part: RoleScorePart) => part.share === 1;

interface ScoreBreakdownProps {
    columns: RoleStatColumn[];
    heroes: Record<TeamSide, HeroScore[]>;
    formatValue: (stat: RoleStat, value: number | null) => string;
}

export function ScoreBreakdown({
    columns,
    heroes,
    formatValue,
}: ScoreBreakdownProps) {
    const t = useTranslations("replay.rolePerformances");

    const sided: SidedScore[] = [
        ...heroes.ally.map((hero) => ({ hero, side: "ally" as const })),
        ...heroes.enemy.map((hero) => ({ hero, side: "enemy" as const })),
    ];

    const inColumns = (stat: RoleStat) => columns.some((c) => c.stat === stat);

    const gridTemplateColumns = `8rem repeat(${columns.length}, minmax(0, 1fr)) auto`;

    return (
        <div className={styles.root} style={{ gridTemplateColumns }}>
            <span />
            {columns.map(({ stat, weight }) => (
                <span key={stat} className={styles.statHead}>
                    <Typography size="sm" variant="secondary" truncate>
                        {t(`stat.${stat}`)}
                    </Typography>
                    <WeightTag weight={weight} />
                </span>
            ))}
            <Eyebrow noWrap className={styles.scoreHead}>
                {t("scoreColumn")}
            </Eyebrow>
            {sided.map(({ hero, side }) => {
                const heroName = hero.player.heroName;

                // Stats the hero is weighted on outside the role's columns.
                const extraParts = hero.parts.filter((p) => !inColumns(p.stat));
                const extraUnscored = hero.unscored.filter(
                    (u) => !inColumns(u.stat),
                );

                return (
                    <Fragment key={hero.player.playerId}>
                        <Typography
                            size="sm"
                            weight="semibold"
                            truncate
                            className={classNames(
                                styles.name,
                                sideClasses(side),
                            )}
                        >
                            {heroName}
                        </Typography>
                        {columns.map(({ stat }) => {
                            const part = hero.parts.find(
                                (p) => p.stat === stat,
                            );

                            if (part === undefined) {
                                const unscored = hero.unscored.find(
                                    (u) => u.stat === stat,
                                );
                                const label = unscored
                                    ? t(unscored.reason, { hero: heroName })
                                    : t("notCounted", { hero: heroName });

                                return (
                                    <SkippedCell
                                        key={stat}
                                        side={side}
                                        label={label}
                                    />
                                );
                            }

                            return (
                                <StatCell
                                    key={stat}
                                    part={part}
                                    side={side}
                                    best={isBest(part)}
                                    formatValue={formatValue}
                                />
                            );
                        })}
                        <Typography
                            weight="semibold"
                            mono
                            className={classNames(
                                styles.score,
                                sideClasses(side),
                            )}
                        >
                            {formatScore(hero.score)}
                        </Typography>
                        {(extraParts.length > 0 ||
                            extraUnscored.length > 0) && (
                            <>
                                <span />
                                <ExtraStats
                                    heroName={heroName}
                                    side={side}
                                    parts={extraParts}
                                    unscored={extraUnscored}
                                    formatValue={formatValue}
                                    gridColumn={`2 / span ${columns.length}`}
                                />
                                <span />
                            </>
                        )}
                    </Fragment>
                );
            })}
        </div>
    );
}

function WeightTag({ weight }: { weight: number }) {
    const t = useTranslations("replay.rolePerformances");

    if (weight <= 1) return null;

    return (
        <span className={styles.weight}>
            <Tooltip
                content={t("weight", { weight })}
                description={t("weightHint", { weight })}
            >
                <Chip size="sm" icon={Dumbbell}>
                    {t("weightTag", { weight })}
                </Chip>
            </Tooltip>
            <span className={styles.srOnly}>{t("weight", { weight })}</span>
        </span>
    );
}

interface ExtraStatsProps {
    heroName: string;
    side: TeamSide;
    parts: RoleScorePart[];
    unscored: RoleUnscoredStat[];
    formatValue: (stat: RoleStat, value: number | null) => string;
    gridColumn: string;
}

function ExtraStats({
    heroName,
    side,
    parts,
    unscored,
    formatValue,
    gridColumn,
}: ExtraStatsProps) {
    const t = useTranslations("replay.rolePerformances");

    return (
        <div
            className={classNames(styles.extras, sideClasses(side))}
            style={{ gridColumn }}
        >
            <Eyebrow noWrap>{t("alsoCounts", { hero: heroName })}</Eyebrow>
            {parts.map((part) => {
                const best = isBest(part);

                return (
                    <span key={part.stat} className={styles.extra}>
                        <span className={styles.statHead}>
                            <Typography size="sm" variant="secondary" noWrap>
                                {t(`stat.${part.stat}`)}
                            </Typography>
                            <WeightTag weight={part.weight} />
                        </span>
                        <span
                            className={classNames(styles.track, {
                                [styles.best]: best,
                            })}
                        >
                            <span
                                className={styles.fill}
                                style={{ width: `${part.share * 100}%` }}
                            />
                        </span>
                        <Typography size="xs" mono weight="semibold" noWrap>
                            {formatValue(part.stat, part.value)}
                        </Typography>
                        <Typography
                            size="xs"
                            mono
                            noWrap
                            variant={best ? "primary" : "tertiary"}
                        >
                            {t("points", { points: part.points })}
                        </Typography>
                        {best && (
                            <Typography size="sm" variant="tertiary">
                                {t("bestInRole")}
                            </Typography>
                        )}
                    </span>
                );
            })}
            {unscored.map(({ stat, reason }) => (
                <span key={stat} className={styles.extra}>
                    <Typography size="sm" variant="secondary" noWrap>
                        {t(`stat.${stat}`)}
                    </Typography>
                    <Typography size="sm" variant="tertiary">
                        {t(reason, { hero: heroName })}
                    </Typography>
                </span>
            ))}
        </div>
    );
}

interface SkippedCellProps {
    side: TeamSide;
    label: string;
}

function SkippedCell({ side, label }: SkippedCellProps) {
    return (
        <span
            className={classNames(
                styles.cell,
                styles.skipped,
                sideClasses(side),
            )}
        >
            <Typography
                size="xs"
                variant="tertiary"
                truncate
                className={styles.value}
            >
                {label}
            </Typography>
        </span>
    );
}

interface StatCellProps {
    part: RoleScorePart;
    side: TeamSide;
    best: boolean;
    formatValue: (stat: RoleStat, value: number | null) => string;
}

function StatCell({ part, side, best, formatValue }: StatCellProps) {
    const t = useTranslations("replay.rolePerformances");

    const { stat, value, share, points } = part;

    return (
        <span
            className={classNames(styles.cell, sideClasses(side), {
                [styles.best]: best,
            })}
        >
            <span
                className={styles.fill}
                style={{ width: `${share * 100}%` }}
            />
            <Typography
                size="xs"
                mono
                truncate
                weight={best ? "semibold" : "regular"}
                variant={best ? "primary" : "secondary"}
                className={styles.value}
            >
                {formatValue(stat, value)}
            </Typography>
            <Typography
                size="xs"
                mono
                noWrap
                variant={best ? "primary" : "tertiary"}
                className={styles.points}
            >
                {t("points", { points })}
            </Typography>
        </span>
    );
}
