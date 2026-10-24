import dayjs, { type Dayjs } from "dayjs";

export const DATE_PRESETS = [
    "any",
    "last7",
    "last30",
    "year",
    "custom",
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

export type DayRange = { start: string; end: string };

export type DateRange =
    | { preset: Exclude<DatePreset, "custom"> }
    | ({ preset: "custom" } & DayRange);

export const ANY_TIME: DateRange = { preset: "any" };

const DAY_FORMAT = "YYYY-MM-DD";

export const toDay = (date: Dayjs) => date.format(DAY_FORMAT);

export function rangeDays(range: DateRange, today = dayjs()): DayRange | null {
    switch (range.preset) {
        case "any":
            return null;
        case "last7":
            return {
                start: toDay(today.subtract(6, "day")),
                end: toDay(today),
            };
        case "last30":
            return {
                start: toDay(today.subtract(29, "day")),
                end: toDay(today),
            };
        case "year":
            return { start: toDay(today.startOf("year")), end: toDay(today) };
        case "custom":
            return { start: range.start, end: range.end };
    }
}

export function rangeBounds(range: DateRange) {
    const days = rangeDays(range);
    if (!days) return null;
    return {
        from: dayjs(days.start).startOf("day").toDate(),
        to: dayjs(days.end).add(1, "day").startOf("day").toDate(),
    };
}

export function monthGrid(month: Dayjs): (Dayjs | null)[] {
    const first = month.startOf("month");
    const offset = (first.day() + 6) % 7;
    return [
        ...Array<null>(offset).fill(null),
        ...Array.from({ length: first.daysInMonth() }, (_, i) =>
            first.add(i, "day"),
        ),
    ];
}

export const weekDays = () => {
    const monday = dayjs().startOf("week").add(1, "day");
    return Array.from({ length: 7 }, (_, i) => monday.add(i, "day"));
};
