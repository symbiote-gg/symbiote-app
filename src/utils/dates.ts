import { useMemo } from "react";
import {
    useFormatter,
    useLocale,
    useTimeZone,
    useTranslations,
} from "use-intl";

function withYear<T extends object>(options: T, date: Date, now: Date) {
    return date.getFullYear() === now.getFullYear()
        ? options
        : { ...options, year: "numeric" as const };
}

export function formatDuration(secs: number) {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

export function usePlayedAt() {
    const format = useFormatter();
    const t = useTranslations("dates");

    return (timestamp: string, now = new Date()) => {
        const date = new Date(timestamp);
        if (now.getTime() - date.getTime() < DAY_MS / 2) {
            return format.relativeTime(date, { now, style: "short" });
        }

        const today = startOfToday();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (date >= today) return format.dateTime(date, TIME_FORMAT);
        if (date >= yesterday) return t("yesterday");

        return format.dateTime(date, withYear(DATE_FORMAT, date, now));
    };
}

export function usePlayedOn() {
    const format = useFormatter();
    const t = useTranslations("dates");
    const locale = useLocale();
    const timeZone = useTimeZone();
    const dayFormat = useMemo(
        () =>
            new Intl.DateTimeFormat(locale, {
                ...FULL_DATE_FORMAT,
                timeZone,
            }),
        [locale, timeZone],
    );

    return (timestamp: string) => {
        const date = new Date(timestamp);
        const day = dayFormat
            .formatToParts(date)
            .map((part) =>
                part.type === "literal"
                    ? part.value.replace(/,/g, "")
                    : part.value,
            )
            .join("");

        return t("dateAtTime", {
            date: day,
            time: format.dateTime(date, TIME_FORMAT),
        });
    };
}

const TIME_FORMAT = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
} as const;

const DATE_FORMAT = { month: "short", day: "numeric" } as const;

const FULL_DATE_FORMAT = { ...DATE_FORMAT, year: "numeric" } as const;
