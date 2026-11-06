import { TrendingUp } from "lucide-react";
import { useId } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroTrend } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Tooltip, Typography } from "@/ui";
import { isJudged, isRated, winRate } from "@/utils/hero-stats";
import {
    type Bucket,
    type Point,
    curve,
    fillBuckets,
    rateDomain,
} from "./buckets";

import styles from "./styles.module.css";

const MAX_LABELS = 12;

export interface TrendProps {
    hero: string;
    trend: HeroTrend;
}

export function Trend({ hero, trend }: TrendProps) {
    const t = useTranslations("hero.trend");
    const format = useFormatter();
    const { percent } = useFormatStat();
    const gradient = useId();

    const buckets = fillBuckets(trend);
    const count = buckets.length;
    const maxGames = Math.max(1, ...buckets.map((bucket) => bucket.games));
    const labelEvery = Math.ceil(count / MAX_LABELS);

    // Buckets with too few games swing too much to draw, but still show their
    // bar and their rate in the tooltip.
    const rates = buckets.map((bucket) =>
        isRated(bucket.wins, bucket.losses)
            ? winRate(bucket.wins, bucket.losses)
            : null,
    );
    const domain = rateDomain(rates.filter((rate) => rate !== null));

    const x = (index: number) => ((index + 0.5) / count) * 100;
    const y = (rate: number) =>
        ((domain.high - rate) / (domain.high - domain.low)) * 100;

    const segments: Point[][] = [[]];
    rates.forEach((rate, index) => {
        if (rate === null) segments.push([]);
        else segments[segments.length - 1].push({ x: x(index), y: y(rate) });
    });
    const lines = segments.filter((segment) => segment.length > 1);

    // A rated bucket between unrated ones has no line to sit on, so it gets a dot.
    const isolated = rates.flatMap((rate, index) =>
        rate !== null &&
        (rates[index - 1] ?? null) === null &&
        (rates[index + 1] ?? null) === null
            ? [index]
            : [],
    );

    const lastIndex = rates.reduce<number>(
        (last, rate, index) => (rate === null ? last : index),
        -1,
    );
    const lastRate = lastIndex >= 0 ? rates[lastIndex] : null;

    const bestIndex = buckets.reduce<number>((best, bucket, index) => {
        const rate = rates[index];
        if (rate === null || !isJudged(bucket.wins, bucket.losses)) return best;
        return best < 0 || rate > (rates[best] ?? 0) ? index : best;
    }, -1);
    const bestRate = bestIndex >= 0 ? rates[bestIndex] : null;
    const dots = [...new Set([bestIndex, lastIndex, ...isolated])];

    const bucketName = (bucket: Bucket) =>
        trend.bucket === "week"
            ? t("week", {
                  date: format.dateTime(bucket.start.toDate(), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                  }),
              })
            : format.dateTime(bucket.start.toDate(), {
                  month: "long",
                  year: "numeric",
              });

    const shortName = (bucket: Bucket) =>
        format.dateTime(
            bucket.start.toDate(),
            trend.bucket === "week"
                ? { month: "short", day: "numeric" }
                : { month: "short" },
        );

    const axisLabel = (bucket: Bucket, index: number) =>
        trend.bucket === "month" && (index === 0 || bucket.start.month() === 0)
            ? format.dateTime(bucket.start.toDate(), {
                  month: "short",
                  year: "numeric",
              })
            : shortName(bucket);

    const summary = (bucket: Bucket) => {
        const rate = winRate(bucket.wins, bucket.losses);

        return bucket.games === 0
            ? t("noGames")
            : [
                  t("games", { count: bucket.games }),
                  t("record", { wins: bucket.wins, losses: bucket.losses }),
                  rate === null ? null : t("winRate", { rate: percent(rate) }),
              ]
                  .filter(Boolean)
                  .join(", ");
    };

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={TrendingUp}
                title={t("title")}
                subtitle={t(trend.bucket === "week" ? "byWeek" : "byMonth", {
                    hero,
                })}
            />
            <div className={styles.body}>
                <div className={styles.ticks}>
                    {domain.ticks.map((tick) => (
                        <Typography
                            key={tick}
                            as="span"
                            size="xs"
                            variant="tertiary"
                            mono
                            className={styles.tick}
                            style={{ top: `${y(tick)}%` }}
                        >
                            {percent(tick)}
                        </Typography>
                    ))}
                </div>
                <div className={styles.rate}>
                    {domain.ticks.map((tick) => (
                        <span
                            key={tick}
                            className={
                                tick === 0.5 ? styles.guide : styles.grid
                            }
                            style={{ top: `${y(tick)}%` }}
                        />
                    ))}
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className={styles.line}
                        aria-hidden
                    >
                        <defs>
                            <linearGradient
                                id={gradient}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0" className={styles.fillTop} />
                                <stop
                                    offset="1"
                                    className={styles.fillBottom}
                                />
                            </linearGradient>
                        </defs>
                        {lines.map((segment, index) => (
                            <path
                                key={index}
                                d={area(segment)}
                                fill={`url(#${gradient})`}
                                className={styles.area}
                            />
                        ))}
                        {lines.map((segment, index) => (
                            <path
                                key={index}
                                d={curve(segment)}
                                className={styles.stroke}
                            />
                        ))}
                    </svg>
                    {dots.map((index) => {
                        const rate = index >= 0 ? rates[index] : null;
                        return (
                            rate !== null && (
                                <span
                                    key={index}
                                    className={styles.dot}
                                    style={{
                                        left: `${x(index)}%`,
                                        top: `${y(rate)}%`,
                                    }}
                                />
                            )
                        );
                    })}
                    {bestRate !== null && bestIndex !== lastIndex && (
                        <Typography
                            as="span"
                            size="xs"
                            weight="semibold"
                            mono
                            noWrap
                            className={styles.best}
                            style={{
                                left: `${x(bestIndex)}%`,
                                top: `${y(bestRate)}%`,
                            }}
                        >
                            {t("best", {
                                bucket: shortName(buckets[bestIndex]),
                                rate: percent(bestRate),
                            })}
                        </Typography>
                    )}
                    {lastIndex < 0 && (
                        <Typography
                            as="p"
                            size="sm"
                            variant="tertiary"
                            className={styles.empty}
                        >
                            {t("noLine", { bucket: trend.bucket })}
                        </Typography>
                    )}
                    {lastRate !== null && (
                        <Typography
                            as="span"
                            size="xs"
                            mono
                            noWrap
                            className={styles.last}
                            style={{
                                left: `${x(lastIndex)}%`,
                                top: `${y(lastRate)}%`,
                            }}
                        >
                            {lastIndex === bestIndex
                                ? t("best", {
                                      bucket: shortName(buckets[lastIndex]),
                                      rate: percent(lastRate),
                                  })
                                : `${shortName(buckets[lastIndex])} ${percent(lastRate)}`}
                        </Typography>
                    )}
                </div>
                <div className={styles.games}>
                    {buckets.map((bucket) => (
                        <span
                            key={bucket.start.valueOf()}
                            className={styles.slot}
                        >
                            {bucket.games > 0 && (
                                <span
                                    className={styles.bar}
                                    style={{
                                        height: `${(bucket.games / maxGames) * 100}%`,
                                    }}
                                />
                            )}
                        </span>
                    ))}
                </div>
                <div className={styles.labels}>
                    {buckets.map((bucket, index) => (
                        <span
                            key={bucket.start.valueOf()}
                            className={styles.label}
                        >
                            {index % labelEvery === 0 && (
                                <Typography
                                    as="span"
                                    size="xs"
                                    variant="tertiary"
                                    mono
                                    noWrap
                                >
                                    {axisLabel(bucket, index)}
                                </Typography>
                            )}
                        </span>
                    ))}
                </div>
                <div className={styles.hits}>
                    {buckets.map((bucket) => (
                        <Tooltip
                            key={bucket.start.valueOf()}
                            content={bucketName(bucket)}
                            description={summary(bucket)}
                            className={styles.hit}
                        >
                            <span
                                tabIndex={0}
                                aria-label={`${bucketName(bucket)}: ${summary(bucket)}`}
                                className={styles.crosshair}
                            />
                        </Tooltip>
                    ))}
                </div>
            </div>
        </Card>
    );
}

/** The closed shape between a line and the bottom of the plot. */
function area(points: Point[]) {
    const first = points[0];
    const last = points[points.length - 1];

    return `${curve(points)} L${last.x},100 L${first.x},100 Z`;
}
