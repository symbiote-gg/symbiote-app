import dayjs from "dayjs";
import { useMemo } from "react";
import {
    useFormatter,
    useLocale,
    useTimeZone,
    useTranslations,
} from "use-intl";

export function formatDuration(secs: number) {
    const rounded = Math.round(secs);
    const minutes = Math.floor(rounded / 60);
    const seconds = rounded % 60;
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

export function usePlayedDay() {
    return useDayLabel(MONTH_FORMAT);
}

export function usePlayedDate() {
    return useDayLabel(FULL_DATE_FORMAT);
}

function useDayLabel(otherYear: typeof MONTH_FORMAT | typeof FULL_DATE_FORMAT) {
    const format = useFormatter();
    const t = useTranslations("dates");

    return (timestamp: string) => {
        const now = dayjs();
        const date = dayjs(timestamp);

        if (date.isSame(now, "day")) {
            return t("today");
        }

        if (date.isSame(now.subtract(1, "day"), "day")) {
            return t("yesterday");
        }

        return format.dateTime(
            date.toDate(),
            date.isSame(now, "year") ? DATE_FORMAT : otherYear,
        );
    };
}

export function usePlayedDayTime() {
    const dayAtTime = useDayAtTime();

    return (timestamp: string) =>
        dayAtTime(timestamp, !dayjs(timestamp).isSame(dayjs(), "year"));
}

export function usePlayedOn() {
    const dayAtTime = useDayAtTime();

    return (timestamp: string) => dayAtTime(timestamp, true);
}

function useDayAtTime() {
    const format = useFormatter();
    const t = useTranslations("dates");
    const locale = useLocale();
    const timeZone = useTimeZone();
    const formats = useMemo(
        () => ({
            day: new Intl.DateTimeFormat(locale, { ...DATE_FORMAT, timeZone }),
            year: new Intl.DateTimeFormat(locale, {
                ...FULL_DATE_FORMAT,
                timeZone,
            }),
        }),
        [locale, timeZone],
    );

    return (timestamp: string, withYear: boolean) => {
        const date = new Date(timestamp);

        // Intl puts a comma before the year, which reads oddly before "at".
        const day = (withYear ? formats.year : formats.day)
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

const MONTH_FORMAT = { month: "short", year: "numeric" } as const;
