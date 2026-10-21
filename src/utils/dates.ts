import { useFormatter, useTranslations } from "use-intl";

const PLAYED_FORMAT = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
} as const;

function withYear<T extends object>(options: T, date: Date, now: Date) {
    return date.getFullYear() === now.getFullYear()
        ? options
        : { ...options, year: "numeric" as const };
}

export function playedFormat(timestamp: string, now = new Date()) {
    return withYear(PLAYED_FORMAT, new Date(timestamp), now);
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

        const yesterday = startOfToday();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date >= startOfToday()) return format.dateTime(date, TIME_FORMAT);
        if (date >= yesterday) return t("yesterday");

        return format.dateTime(date, withYear(DATE_FORMAT, date, now));
    };
}

const TIME_FORMAT = {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
} as const;

const DATE_FORMAT = { month: "short", day: "numeric" } as const;
