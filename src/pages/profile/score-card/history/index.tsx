import { History as HistoryIcon } from "lucide-react";
import { type CSSProperties, type MouseEvent, useId, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { ScorePoint } from "@/api/stats";
import { ChipButton, ChipDivider, ChipGroup, StatTile, Typography } from "@/ui";
import { usePlayedDate } from "@/utils/dates";
import { GemIcon } from "../gem";
import { TIERS, rankTone, tierIndex, tierRange } from "../tiers";
import { type ScoreDay, scoreDays } from "./days";
import { Hits } from "./hits";

import styles from "./styles.module.css";

// Room past the outer cuts, so the open ends still show a band of their colour.
const PAD = 5;

const TOP = 100;

export interface HistoryProps {
    points: ScorePoint[];
    score: number | null;
    games: number;
}

const time = (point: ScorePoint) => new Date(point.timestamp).getTime();

const DAY = 24 * 60 * 60 * 1000;

// Under this span the axis counts days rather than months.
const DAY_LABELS_UNDER = 45 * DAY;

const monthStep = (months: number) => {
    if (months <= 4) return 1;
    if (months <= 18) return 3;
    if (months <= 36) return 6;
    return 12;
};

type DateUnit = "day" | "month";

/** Dates to label along the axis, at the start of each day or month. */
function dateTicks(start: number, end: number) {
    const ticks: Date[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);

    if (end - start < DAY_LABELS_UNDER) {
        const step = end - start <= 10 * DAY ? 1 : 7;

        while (cursor.getTime() <= end) {
            if (cursor.getTime() >= start) ticks.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + step);
        }

        return { unit: "day" as DateUnit, ticks };
    }

    const months =
        (new Date(end).getFullYear() - new Date(start).getFullYear()) * 12 +
        new Date(end).getMonth() -
        new Date(start).getMonth();
    const step = monthStep(months);

    cursor.setDate(1);
    while (cursor.getTime() <= end) {
        if (cursor.getTime() >= start && cursor.getMonth() % step === 0) {
            ticks.push(new Date(cursor));
        }
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return { unit: "month" as DateUnit, ticks };
}

/** The dates the axis spans: the picked range, or the games themselves. */
type Range = "3m" | "6m" | "1y" | "all";

const RECENT: readonly Range[] = ["3m", "6m", "1y"];

const RANGE_MONTHS: Record<Exclude<Range, "all">, number> = {
    "3m": 3,
    "6m": 6,
    "1y": 12,
};

/** The dates the axis spans: the picked months up to today, or the games themselves. */
function span(points: ScorePoint[], range: Range) {
    if (range !== "all") {
        const start = new Date();
        start.setMonth(start.getMonth() - RANGE_MONTHS[range]);

        return { start: start.getTime(), end: Date.now() };
    }

    const start = points.length ? time(points[0]) : Date.now() - DAY;
    const end = points.length ? time(points[points.length - 1]) : Date.now();

    return { start, end: Math.max(end, start + DAY) };
}

export function History({ points, score, games }: HistoryProps) {
    const t = useTranslations("profile.score");
    const format = useFormatter();
    const playedDate = usePlayedDate();
    const id = useId();
    const [range, setRange] = useState<Range>("all");

    const axis = span(points, range);
    const shown = points.filter((point) => time(point) >= axis.start);
    const scores = shown.map((point) => point.score);
    const best = scores.length ? Math.max(...scores) : null;
    const lowest = scores.length ? Math.min(...scores) : null;

    const onRangeClick = (e: MouseEvent<HTMLButtonElement>) =>
        setRange(e.currentTarget.value as Range);

    const chip = (value: Range) => {
        const { start } = span(points, value);

        return (
            <ChipButton
                key={value}
                count={points.filter((point) => time(point) >= start).length}
                pressed={value === range}
                value={value}
                onClick={onRangeClick}
            >
                {t(`history.range.${value}`)}
            </ChipButton>
        );
    };

    const days = scoreDays(points, axis.start, axis.end);
    const dayLabels = days.map((day) =>
        t("history.dayLabel", {
            date: playedDate(day.day.format("YYYY-MM-DD")),
            score: day.score,
        }),
    );

    const formatDate = (date: Date, unit: DateUnit, year: boolean) =>
        format.dateTime(date, {
            month: "short",
            day: unit === "day" ? "numeric" : undefined,
            year: year ? "numeric" : undefined,
        });

    const stretch = (label: string, value: number | null) => (
        <StatTile
            variant="panel"
            label={label}
            value={value ?? "-"}
            icon={value === null ? undefined : GemIcon}
            accent={value === null ? undefined : "tone"}

            style={value === null ? undefined : tileTone(value)}
        />
    );

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div className={styles.heading}>
                    <Typography size="lg" weight="semibold">
                        {t("history.title")}
                    </Typography>
                    <Typography size="sm" variant="tertiary">
                        {t("history.subtitle")}
                    </Typography>
                </div>
                <ChipGroup label={t("history.range.label")}>
                    {RECENT.map(chip)}
                    <ChipDivider />
                    {chip("all")}
                </ChipGroup>
            </div>
            <div className={styles.tiles}>
                <StatTile
                    variant="panel"
                    icon={HistoryIcon}
                    label={t("recent", { count: games })}
                    value={score ?? "-"}
                />
                {stretch(t("history.best"), best)}
                {stretch(t("history.lowest"), lowest)}
            </div>
            <Chart
                id={id}
                points={shown}
                days={days}
                dayLabels={dayLabels}
                {...axis}
                formatDate={formatDate}
            />
        </div>
    );
}

// Scores come rounded to whole points, and a night of games stacks them in one
// spot on a date axis, which draws as stairs. The line samples a weighted
// average over nearby dates instead. The window narrows towards the ends, so
// the line still starts and ends on real scores.
const SAMPLES = 200;

// Half the width, in percent of the plot, over which the area's colour blends at a cut.
const BLEND = 1.5;
const SPREAD = 0.01;

function curve(points: ScorePoint[], start: number, end: number) {
    const span = end - start;
    const times = points.map(time);

    const at = (moment: number) => {
        const spread = Math.min(SPREAD * span, moment - start, end - moment);
        if (spread <= 0)
            return moment <= start
                ? points[0].score
                : points[points.length - 1].score;

        let total = 0;
        let weights = 0;
        times.forEach((when, index) => {
            const weight = Math.exp(-(((when - moment) / spread) ** 2) / 2);
            total += weight * points[index].score;
            weights += weight;
        });
        if (weights > 0) return total / weights;

        // Over a long break no game is near, so it bridges the two either side.
        const after = times.findIndex((when) => when > moment);
        const share =
            (moment - times[after - 1]) / (times[after] - times[after - 1]);

        return (
            points[after - 1].score +
            share * (points[after].score - points[after - 1].score)
        );
    };

    return Array.from({ length: SAMPLES + 1 }, (_, index) => {
        const moment = start + (span * index) / SAMPLES;

        return { moment, score: at(moment) };
    });
}

const tierText = (score: number) => rankTone(TIERS[tierIndex(score)].rank);

const tileTone = (score: number) =>
    ({
        ...tierText(score),
        "--card-icon": "var(--rank)",
        "--tone": "var(--rank-text)",
    }) as CSSProperties;

interface ChartProps {
    id: string;
    points: ScorePoint[];
    days: ScoreDay[];
    dayLabels: string[];
    start: number;
    end: number;
    formatDate: (date: Date, unit: DateUnit, year: boolean) => string;
}

function Chart({
    id,
    points,
    days,
    dayLabels,
    start,
    end,
    formatDate,
}: ChartProps) {
    const scores = points.map((point) => point.score);
    const low = Math.max(0, Math.min(TIERS[1].from, ...scores) - PAD);
    const high = Math.min(
        TOP,
        Math.max(TIERS[TIERS.length - 1].from, ...scores) + PAD,
    );

    const x = (at: number) => ((at - start) / (end - start)) * 100;
    const y = (value: number) => ((high - value) / (high - low)) * 100;
    const clamp = (value: number) => Math.min(high, Math.max(low, value));

    // Quadratic segments through the samples' midpoints round off the joins.
    const first = points[0];
    const last = points[points.length - 1];

    const sampled =
        points.length >= 2 ? curve(points, time(first), time(last)) : [];
    const samples = sampled.map(({ moment, score }) => [x(moment), y(score)]);
    const line = samples
        .map(([px, py], index) => {
            if (index === 0) return `M${px},${py}`;

            const [nx, ny] = samples[index + 1] ?? [px, py];

            return `Q${px},${py} ${(px + nx) / 2},${(py + ny) / 2}`;
        })
        .join(" ");

    const area =
        line &&
        `${line} L${samples[samples.length - 1][0]},100 L${samples[0][0]},100 Z`;

    // Each column of the area takes the colour of the line above it, blending
    // over a short stretch where the line crosses a cut.
    const changes = sampled.flatMap(({ score }, index) => {
        const rank = TIERS[tierIndex(score)].rank;
        const before = sampled[index - 1];
        if (index > 0 && TIERS[tierIndex(before.score)].rank === rank)
            return [];

        const at =
            index === 0 ? 0 : (samples[index - 1][0] + samples[index][0]) / 2;

        return [{ at, rank }];
    });
    const columns = changes.flatMap(({ at, rank }, index) => {
        if (index === 0) return [{ offset: 0, rank }];

        const previous = changes[index - 1];
        const next = changes[index + 1]?.at ?? 100;
        const blend = Math.min(BLEND, (at - previous.at) / 2, (next - at) / 2);

        return [
            { offset: (at - blend) / 100, rank: previous.rank },
            { offset: (at + blend) / 100, rank },
        ];
    });

    const ticks = TIERS.slice(1)
        .map(({ from }) => from)
        .filter((from) => from >= low && from <= high);

    const bands = TIERS.map((step, index) => {
        const { min, max } = tierRange(index);

        return { ...step, min: clamp(min), max: clamp(max) };
    })
        .filter(({ min, max }) => max > min)
        .reverse();

    // Hard stops at each cut, so the line takes the colour of the rating it's in.
    const stops = bands.flatMap(({ rank, min, max }) => [
        { offset: y(max) / 100, rank },
        { offset: y(min) / 100, rank },
    ]);

    const { unit, ticks: dates } = dateTicks(start, end);

    return (
        <div className={styles.chart}>
            <div className={styles.ticks}>
                {ticks.map((tick) => (
                    <Typography
                        key={tick}
                        as="span"
                        size="xs"
                        variant="tertiary"
                        mono
                        className={styles.tick}
                        style={{ top: `${y(tick)}%` }}
                    >
                        {tick}
                    </Typography>
                ))}
            </div>
            <div className={styles.plot}>
                <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className={styles.line}
                    aria-hidden
                >
                    <defs>
                        <linearGradient
                            id={`${id}-tiers`}
                            gradientUnits="userSpaceOnUse"
                            x1={0}
                            y1={0}
                            x2={0}
                            y2={100}
                        >
                            {stops.map(({ offset, rank }, index) => (
                                <stop
                                    key={index}
                                    offset={offset}
                                    style={{
                                        stopColor: `var(--color-rank-${rank})`,
                                    }}
                                />
                            ))}
                        </linearGradient>
                        <linearGradient
                            id={`${id}-columns`}
                            gradientUnits="userSpaceOnUse"
                            x1={0}
                            y1={0}
                            x2={100}
                            y2={0}
                        >
                            {columns.map(({ offset, rank }, index) => (
                                <stop
                                    key={index}
                                    offset={offset}
                                    style={{
                                        stopColor: `var(--color-rank-${rank})`,
                                    }}
                                />
                            ))}
                        </linearGradient>
                        <linearGradient
                            id={`${id}-fade`}
                            x1={0}
                            y1={0}
                            x2={0}
                            y2={1}
                        >
                            <stop offset={0} className={styles.fadeTop} />
                            <stop offset={1} className={styles.fadeBottom} />
                        </linearGradient>
                        <mask
                            id={`${id}-mask`}
                            maskUnits="userSpaceOnUse"
                            x={0}
                            y={0}
                            width={100}
                            height={100}
                        >
                            <rect
                                width={100}
                                height={100}
                                fill={`url(#${id}-fade)`}
                            />
                        </mask>
                    </defs>
                    {area && (
                        <path
                            d={area}
                            fill={`url(#${id}-columns)`}
                            mask={`url(#${id}-mask)`}
                        />
                    )}
                    {line && (
                        <path
                            d={line}
                            className={styles.stroke}
                            stroke={`url(#${id}-tiers)`}
                        />
                    )}
                </svg>
                {last && (
                    <span
                        className={styles.end}
                        style={{
                            ...tierText(last.score),
                            left: `${x(time(last))}%`,
                            top: `${y(last.score)}%`,
                        }}
                    />
                )}
            </div>
            <div className={styles.labels}>
                {dates.map((date, index) => (
                    <Typography
                        key={date.getTime()}
                        as="span"
                        size="xs"
                        variant="tertiary"
                        mono
                        noWrap
                        className={styles.label}
                        style={{ left: `${x(date.getTime())}%` }}
                    >
                        {formatDate(
                            date,
                            unit,
                            index === 0 ||
                                date.getFullYear() !==
                                    dates[index - 1].getFullYear(),
                        )}
                    </Typography>
                ))}
            </div>
            <Hits days={days} labels={dayLabels} x={x} />
        </div>
    );
}
