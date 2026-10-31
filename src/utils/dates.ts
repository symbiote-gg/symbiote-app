import dayjs from "dayjs";
import { useMemo } from "react";
import {
    useFormatter,
    useLocale,
    useTimeZone,
    useTranslations,
} from "use-intl";

export function formatDuration(secs: number) {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const RELATIVE_HOURS = 12;

export function usePlayedAt() {
    const format = useFormatter();
    const t = useTranslations("dates");

    return (timestamp: string) => {
        const now = dayjs();
        const date = dayjs(timestamp);

        if (now.diff(date, "hour", true) < RELATIVE_HOURS) {
            return format.relativeTime(date.toDate(), {
                now: now.toDate(),
                style: "short",
            });
        }

        if (date.isSame(now, "day")) {
            return format.dateTime(date.toDate(), TIME_FORMAT);
        }

        if (date.isSame(now.subtract(1, "day"), "day")) {
            return t("yesterday");
        }

        return format.dateTime(
            date.toDate(),
            date.isSame(now, "year") ? DATE_FORMAT : FULL_DATE_FORMAT,
        );
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
