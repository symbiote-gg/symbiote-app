import classNames from "classnames";
import type { CSSProperties } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { FormAxis, FormAxisRow } from "@/api/stats";
import { Eyebrow, Skeleton, Typography } from "@/ui";

import styles from "./styles.module.css";

// Clockwise from the top, in the order the backend sends them.
const AXES: FormAxis[] = [
    "heroDamage",
    "siegeDamage",
    "xp",
    "killParticipation",
    "survival",
    "camps",
];

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 320;
const RADIUS = 95;
const RINGS = [25, 50, 75, 100];
const USUAL = 50;

// The side labels sit further out, as they're wider than they're tall.
const LABEL_RADIUS = 128;
const SIDE_LABEL_RADIUS = 152;

const angle = (index: number) => (index / AXES.length) * 2 * Math.PI;

function point(index: number, value: number, radius = RADIUS) {
    const r = (radius * value) / 100;

    return {
        x: r * Math.sin(angle(index)),
        y: -r * Math.cos(angle(index)),
    };
}

// An unrated axis is left out rather than drawn at 0, which would read as a bad game.
function polygon(values: (number | null)[]) {
    return values
        .flatMap((value, index) => {
            if (value === null) return [];

            const { x, y } = point(index, value);
            return `${x},${y}`;
        })
        .join(" ");
}

function labelStyle(index: number): CSSProperties {
    const vertical = index % (AXES.length / 2) === 0;
    const radius = vertical ? LABEL_RADIUS : SIDE_LABEL_RADIUS;
    const { x, y } = point(index, 100, radius);

    return {
        left: `${((x + VIEW_WIDTH / 2) / VIEW_WIDTH) * 100}%`,
        top: `${((y + VIEW_HEIGHT / 2) / VIEW_HEIGHT) * 100}%`,
    };
}

// A few points either way is the swing between games, not form.
function deltaTone(delta: number) {
    if (delta >= 3) return styles.up;
    if (delta > -3) return styles.flat;
    if (delta > -10) return styles.down;
    return styles.drop;
}

export interface RadarProps {
    /** Null while loading. */
    axes: FormAxisRow[] | null;
}

export function Radar({ axes }: RadarProps) {
    const t = useTranslations("profile.recentForm");
    const format = useFormatter();

    const rows = AXES.map((axis) => axes?.find((row) => row.axis === axis));
    const recent = rows.map((row) => row?.recent ?? null);
    const previous = rows.map((row) => row?.previous ?? null);
    const hasPrevious = rows.some((row) => row && row.previous !== null);

    return (
        <div className={styles.chart}>
            <svg
                className={styles.plot}
                viewBox={`${-VIEW_WIDTH / 2} ${-VIEW_HEIGHT / 2} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                aria-hidden
            >
                {RINGS.map((ring) => (
                    <polygon
                        key={ring}
                        className={classNames(styles.ring, {
                            [styles.usual]: ring === USUAL,
                        })}
                        points={polygon(AXES.map(() => ring))}
                    />
                ))}
                {AXES.map((axis, index) => {
                    const { x, y } = point(index, 100);
                    return (
                        <line
                            key={axis}
                            className={styles.spoke}
                            x1={0}
                            y1={0}
                            x2={x}
                            y2={y}
                        />
                    );
                })}
                {hasPrevious && (
                    <polygon
                        className={styles.previous}
                        points={polygon(previous)}
                    />
                )}
                {axes && (
                    <>
                        <polygon
                            className={styles.recent}
                            points={polygon(recent)}
                        />
                        {rows.map((row, index) => {
                            if (row?.recent == null) return null;

                            const { x, y } = point(index, row.recent);
                            return (
                                <circle
                                    key={row.axis}
                                    className={styles.dot}
                                    cx={x}
                                    cy={y}
                                    r={3.5}
                                />
                            );
                        })}
                    </>
                )}
            </svg>
            {AXES.map((axis, index) => {
                const row = rows[index];
                const delta =
                    row?.recent != null && row.previous !== null
                        ? row.recent - row.previous
                        : null;

                return (
                    <div
                        key={axis}
                        className={styles.label}
                        style={labelStyle(index)}
                    >
                        <Eyebrow noWrap>{t(`axes.${axis}`)}</Eyebrow>
                        <div className={styles.figures}>
                            <Typography
                                as="span"
                                display
                                className={styles.value}
                            >
                                {!axes ? (
                                    <Skeleton className={styles.valueBar} />
                                ) : (
                                    (row?.recent ?? t("noValue"))
                                )}
                            </Typography>
                            {delta !== null && (
                                <Typography
                                    as="span"
                                    size="sm"
                                    mono
                                    className={deltaTone(delta)}
                                >
                                    {format.number(delta, {
                                        signDisplay: "exceptZero",
                                    })}
                                </Typography>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
