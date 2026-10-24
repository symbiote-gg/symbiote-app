import classNames from "classnames";
import dayjs, { type Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { useFormatter } from "use-intl";

import { monthGrid, toDay, weekDays } from "@/utils/date-range";

import styles from "./styles.module.css";

export interface RangeCalendarProps {
    month: Dayjs;
    start: Dayjs | null;
    end: Dayjs | null;
    max: Dayjs;
    prevLabel: string;
    nextLabel: string;
    onMonthChange: (month: Dayjs) => void;
    onPick: (day: Dayjs) => void;
}

export function RangeCalendar({
    month,
    start,
    end,
    max,
    prevLabel,
    nextLabel,
    onMonthChange,
    onPick,
}: RangeCalendarProps) {
    const format = useFormatter();
    const [hovered, setHovered] = useState<Dayjs | null>(null);

    const last = end ?? (start && hovered);
    const [low, high] =
        start && last && last.isBefore(start, "day")
            ? [last, start]
            : [start, last];

    const months = [month, month.add(1, "month")];
    const canNext = months[1].isBefore(max, "month");

    const onPrev = () => onMonthChange(month.subtract(1, "month"));
    const onNext = () => onMonthChange(month.add(1, "month"));
    const onDayClick = (e: MouseEvent<HTMLButtonElement>) =>
        onPick(dayjs(e.currentTarget.value));
    const onDayEnter = (e: MouseEvent<HTMLButtonElement>) =>
        setHovered(dayjs(e.currentTarget.value));
    const onLeave = () => setHovered(null);

    return (
        <div className={styles.root} onPointerLeave={onLeave}>
            {months.map((shown, index) => (
                <div key={toDay(shown)} className={styles.month}>
                    <div className={styles.header}>
                        {index === 0 ? (
                            <button
                                type="button"
                                aria-label={prevLabel}
                                className={styles.nav}
                                onClick={onPrev}
                            >
                                <ChevronLeft aria-hidden />
                            </button>
                        ) : (
                            <span className={styles.navSpacer} />
                        )}
                        <span className={styles.title}>
                            {format.dateTime(shown.toDate(), {
                                month: "long",
                                year: "numeric",
                            })}
                        </span>
                        {index === months.length - 1 ? (
                            <button
                                type="button"
                                aria-label={nextLabel}
                                disabled={!canNext}
                                className={styles.nav}
                                onClick={onNext}
                            >
                                <ChevronRight aria-hidden />
                            </button>
                        ) : (
                            <span className={styles.navSpacer} />
                        )}
                    </div>
                    <div className={styles.grid}>
                        {weekDays().map((day) => (
                            <span key={day.day()} className={styles.weekday}>
                                {format.dateTime(day.toDate(), {
                                    weekday: "narrow",
                                })}
                            </span>
                        ))}
                        {monthGrid(shown).map((day, cell) => {
                            if (!day) return <span key={`blank-${cell}`} />;
                            const edge =
                                (low && day.isSame(low, "day")) ||
                                (high && day.isSame(high, "day"));
                            const inside =
                                low &&
                                high &&
                                day.isAfter(low, "day") &&
                                day.isBefore(high, "day");

                            return (
                                <button
                                    key={toDay(day)}
                                    type="button"
                                    value={toDay(day)}
                                    disabled={day.isAfter(max, "day")}
                                    aria-pressed={!!edge}
                                    aria-label={format.dateTime(day.toDate(), {
                                        dateStyle: "full",
                                    })}
                                    className={classNames(styles.day, {
                                        [styles.edge]: edge,
                                        [styles.inside]: inside,
                                        [styles.today]: day.isSame(max, "day"),
                                    })}
                                    onClick={onDayClick}
                                    onPointerEnter={onDayEnter}
                                >
                                    {day.date()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
