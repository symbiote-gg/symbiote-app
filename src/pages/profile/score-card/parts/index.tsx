import classNames from "classnames";
import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "use-intl";

import type { RoleStat } from "@/api/replays";
import type { ScorePillar, ScorePillarId } from "@/api/stats";
import { Meter, Typography } from "@/ui";
import { PILLAR_IDS, PILLAR_STATS } from "../pillars";
import { pillarTone } from "../tones";

import styles from "./styles.module.css";

// Only the part's total carries `data-points`: the ring's count-up writes into it.
const richTotal = (chunks: ReactNode) => (
    <span className={styles.points} data-points>
        {chunks}
    </span>
);

const richPoints = (chunks: ReactNode) => (
    <span className={styles.points}>{chunks}</span>
);

const richMax = (chunks: ReactNode) => (
    <span className={styles.max}>{chunks}</span>
);

interface PartHeadProps {
    id: ScorePillarId;
    total: ReactNode;
    className?: string;
}

function PartHead({ id, total, className }: PartHeadProps) {
    const t = useTranslations("profile.score");

    return (
        <div className={styles.head}>
            <span className={styles.dot} />
            <Typography as="span" weight="semibold" truncate>
                {t(`pillar.${id}`)}
            </Typography>
            <Typography
                as="span"
                size="lg"
                mono
                noWrap
                className={classNames(styles.total, className)}
            >
                {total}
            </Typography>
        </div>
    );
}

interface StatRowProps {
    stat: RoleStat;
    weight: number;
    value: number;
    children: ReactNode;
    className?: string;
}

function StatRow({ stat, weight, value, children, className }: StatRowProps) {
    const names = useTranslations("replay.rolePerformances.stat");

    return (
        <li className={styles.stat}>
            <Typography as="span" size="sm" variant="secondary" noWrap>
                {names(stat)}
            </Typography>
            <span
                className={styles.track}
                style={{ "--weight": weight } as CSSProperties}
            >
                <Meter value={value} color="accent" className={styles.meter} />
            </span>
            <Typography
                as="span"
                size="sm"
                variant="secondary"
                mono
                noWrap
                className={classNames(styles.value, className)}
            >
                {children}
            </Typography>
        </li>
    );
}

interface PartProps {
    pillar: ScorePillar;
    heaviest: number;
}

function Part({ pillar, heaviest }: PartProps) {
    const t = useTranslations("profile.score");

    // Heaviest first, as the track lengths already show.
    const stats = [...pillar.stats].sort((a, b) => b.max - a.max);

    return (
        <li
            className={styles.part}
            style={pillarTone(pillar.id)}
            data-pillar={pillar.id}
        >
            <PartHead
                id={pillar.id}
                total={t.rich("points", {
                    points: pillar.points,
                    max: pillar.max,
                    b: richTotal,
                    of: richMax,
                })}
            />
            <Meter
                value={pillar.points / pillar.max}
                color="accent"
                size="md"
                className={styles.meter}
            />
            <ul className={styles.stats}>
                {stats.map((stat) => (
                    <StatRow
                        key={stat.stat}
                        stat={stat.stat}
                        weight={stat.max / heaviest}
                        value={stat.points / stat.max}
                    >
                        {t.rich("points", {
                            points: stat.points,
                            max: stat.max,
                            b: richPoints,
                            of: richMax,
                        })}
                    </StatRow>
                ))}
            </ul>
        </li>
    );
}

export interface PartsProps {
    pillars: ScorePillar[];
    className?: string;
}

export function Parts({ pillars, className }: PartsProps) {
    // One scale across every part, so a stat's track is as long as its points
    // are worth anywhere on the card.
    const heaviest = Math.max(
        1,
        ...pillars.flatMap((pillar) => pillar.stats.map((stat) => stat.max)),
    );

    return (
        <ul className={classNames(styles.root, className)}>
            {pillars.map((pillar) => (
                <Part key={pillar.id} pillar={pillar} heaviest={heaviest} />
            ))}
        </ul>
    );
}

export interface PartsEmptyProps {
    className?: string;
}

/** The parts before there is a score: every stat that will count, unfilled. */
export function PartsEmpty({ className }: PartsEmptyProps) {
    return (
        <ul className={classNames(styles.root, className)}>
            {PILLAR_IDS.map((id) => (
                <li key={id} className={styles.part} style={pillarTone(id)}>
                    <PartHead id={id} total="-" className={styles.max} />
                    <Meter
                        value={0}
                        color="accent"
                        size="md"
                        className={styles.meter}
                    />
                    <ul className={styles.stats}>
                        {PILLAR_STATS[id].map((stat) => (
                            <StatRow
                                key={stat}
                                stat={stat}
                                weight={1}
                                value={0}
                                className={styles.max}
                            >
                                -
                            </StatRow>
                        ))}
                    </ul>
                </li>
            ))}
        </ul>
    );
}
