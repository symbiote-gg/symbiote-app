import { ChartSpline } from "lucide-react";
import { useId } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { TrendPoint } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Typography } from "@/ui";
import {
    type Day,
    type Point,
    TREND_DAYS,
    curve,
    fillDays,
    rateDomain,
} from "./days";
import { Hits } from "./hits";

import styles from "./styles.module.css";

const MAX_LABELS = 12;

export interface TrendProps {
    hero: string;
    trend: TrendPoint[];
}

export function Trend({ hero, trend }: TrendProps) {
    const t = useTranslations("hero.trend");
    const format = useFormatter();
    const { percent, winPercent } = useFormatStat();
    const gradient = useId();

    const days = fillDays(trend);
    const count = days.length;
    const maxGames = Math.max(1, ...days.map((day) => day.games));
    const labelEvery = Math.ceil(count / MAX_LABELS);

    const rates = days.map((day) => day.rate);
    const domain = rateDomain(rates.filter((rate) => rate !== null));

    const x = (index: number) => ((index + 0.5) / count) * 100;
    const y = (rate: number) =>
        ((domain.high - rate) / (domain.high - domain.low)) * 100;

    // The career rate carries across days without games, so one line connects
    // every rated day.
    const line: Point[] = rates.flatMap((rate, index) =>
        rate === null ? [] : [{ x: x(index), y: y(rate) }],
    );

    const dayName = (day: Day) =>
        format.dateTime(day.day.toDate(), {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });

    const axisLabel = (day: Day) =>
        format.dateTime(day.day.toDate(), { month: "short", day: "numeric" });

    const summary = (day: Day) =>
        day.games === 0
            ? t("noGames")
            : [
                  t("games", { count: day.games }),
                  t("record", { wins: day.wins, losses: day.losses }),
                  day.rate === null
                      ? null
                      : t("career", { rate: winPercent(day.rate) }),
              ]
                  .filter(Boolean)
                  .join(", ");

    const labels = days.map((day) => `${dayName(day)}: ${summary(day)}`);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartSpline}
                title={t("title")}
                subtitle={t("subtitle", { hero, days: TREND_DAYS })}
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
                        {line.length > 1 && (
                            <path
                                d={area(line)}
                                fill={`url(#${gradient})`}
                                className={styles.area}
                            />
                        )}
                        {line.length > 1 && (
                            <path d={curve(line)} className={styles.stroke} />
                        )}
                    </svg>
                    {line.length === 1 && (
                        <span
                            className={styles.dot}
                            style={{
                                left: `${line[0].x}%`,
                                top: `${line[0].y}%`,
                            }}
                        />
                    )}
                    {line.length === 0 && (
                        <Typography
                            as="p"
                            size="sm"
                            variant="tertiary"
                            className={styles.empty}
                        >
                            {t("noLine")}
                        </Typography>
                    )}
                </div>
                <div className={styles.games}>
                    {days.map((day) => (
                        <span key={day.day.valueOf()} className={styles.slot}>
                            {day.games > 0 && (
                                <span
                                    className={styles.bar}
                                    style={{
                                        height: `${(day.games / maxGames) * 100}%`,
                                    }}
                                />
                            )}
                        </span>
                    ))}
                </div>
                <div className={styles.labels}>
                    {days.map((day, index) => (
                        <span key={day.day.valueOf()} className={styles.label}>
                            {index % labelEvery === 0 && (
                                <Typography
                                    as="span"
                                    size="xs"
                                    variant="tertiary"
                                    mono
                                    noWrap
                                >
                                    {axisLabel(day)}
                                </Typography>
                            )}
                        </span>
                    ))}
                </div>
                <Hits days={days} labels={labels} />
            </div>
        </Card>
    );
}

function area(points: Point[]) {
    const first = points[0];
    const last = points[points.length - 1];

    return `${curve(points)} L${last.x},100 L${first.x},100 Z`;
}
