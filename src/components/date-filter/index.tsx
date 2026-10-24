import classNames from "classnames";
import dayjs, { type Dayjs } from "dayjs";
import { CalendarDays } from "lucide-react";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { Button, Dropdown, FilterTrigger, RangeCalendar } from "@/ui";
import {
    ANY_TIME,
    DATE_PRESETS,
    type DatePreset,
    type DateRange,
    rangeDays,
    toDay,
} from "@/utils/date-range";

import styles from "./styles.module.css";

type Draft = {
    preset: DatePreset;
    start: Dayjs | null;
    end: Dayjs | null;
};

type Preset = Exclude<DatePreset, "any" | "custom">;

// "Any time" is the filter's cleared state, reached through the trigger's ×, and a
// custom range comes from picking days on the calendar.
const PRESETS = DATE_PRESETS.filter(
    (preset): preset is Preset => preset !== "any" && preset !== "custom",
);

const SHORT = { month: "short", day: "numeric" } as const;
const FULL = { ...SHORT, year: "numeric" } as const;

export interface DateFilterProps {
    value: DateRange;
    onChange: (value: DateRange) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
    const t = useTranslations("filters.date");
    const format = useFormatter();
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Draft>({
        preset: "any",
        start: null,
        end: null,
    });
    const [month, setMonth] = useState(() => dayjs().startOf("month"));
    const presets = useRef<HTMLDivElement>(null);

    const today = dayjs();

    // The panel stays hidden until it's positioned, and hidden buttons can't take focus.
    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() =>
            (
                presets.current?.querySelector<HTMLButtonElement>(
                    "[aria-pressed=true]",
                ) ?? presets.current?.querySelector("button")
            )?.focus(),
        );
        return () => cancelAnimationFrame(frame);
    }, [open]);

    const formatDay = (day: Dayjs, withYear: boolean) =>
        format.dateTime(day.toDate(), withYear ? FULL : SHORT);

    const valueLabel = () => {
        if (value.preset !== "custom") return t(`presets.${value.preset}`);
        const start = dayjs(value.start);
        const end = dayjs(value.end);
        const withYear =
            !start.isSame(today, "year") || !end.isSame(today, "year");
        if (start.isSame(end, "day")) return formatDay(start, withYear);
        return t("range", {
            start: formatDay(start, withYear),
            end: formatDay(end, withYear),
        });
    };

    const onToggleOpen = () => {
        if (open) {
            setOpen(false);
            return;
        }
        const days = rangeDays(value, today);
        const start = days && dayjs(days.start);
        const end = days && dayjs(days.end);
        setDraft({ preset: value.preset, start, end });
        setMonth((end ?? today).startOf("month").subtract(1, "month"));
        setOpen(true);
    };
    const onClose = () => setOpen(false);
    const onClear = () => onChange(ANY_TIME);

    const onPreset = (e: MouseEvent<HTMLButtonElement>) => {
        onChange({ preset: e.currentTarget.value as Preset });
        setOpen(false);
    };

    const onPick = (day: Dayjs) => {
        const { start, end } = draft;
        if (!start || end) {
            setDraft({ preset: "custom", start: day, end: null });
        } else if (day.isBefore(start, "day")) {
            setDraft({ preset: "custom", start: day, end: start });
        } else {
            setDraft({ preset: "custom", start, end: day });
        }
    };

    const onApply = () => {
        if (!draft.start || !draft.end) return;
        onChange({
            preset: "custom",
            start: toDay(draft.start),
            end: toDay(draft.end),
        });
        setOpen(false);
    };

    return (
        <>
            <FilterTrigger
                ref={setAnchor}
                icon={<CalendarDays />}
                label={t("label")}
                value={valueLabel()}
                active={value.preset !== "any"}
                open={open}
                clearLabel={t("clear")}
                aria-controls={id}
                onClick={onToggleOpen}
                onClear={onClear}
            />
            <Dropdown
                open={open}
                anchor={anchor}
                id={id}
                aria-label={t("label")}
                className={styles.panel}
                onClose={onClose}
            >
                <div ref={presets} className={styles.presets}>
                    {PRESETS.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            value={preset}
                            aria-pressed={draft.preset === preset}
                            className={classNames(styles.preset, {
                                [styles.selected]: draft.preset === preset,
                            })}
                            onClick={onPreset}
                        >
                            {t(`presets.${preset}`)}
                        </button>
                    ))}
                </div>
                <div className={styles.main}>
                    <div className={styles.calendar}>
                        <RangeCalendar
                            month={month}
                            start={draft.start}
                            end={draft.end}
                            max={today}
                            prevLabel={t("previousMonth")}
                            nextLabel={t("nextMonth")}
                            onMonthChange={setMonth}
                            onPick={onPick}
                        />
                    </div>
                    <footer className={styles.footer}>
                        {draft.start && !draft.end && (
                            <span className={styles.hint}>{t("pickEnd")}</span>
                        )}
                        <span className={styles.actions}>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onClose}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                size="sm"
                                disabled={!draft.start || !draft.end}
                                onClick={onApply}
                            >
                                {t("apply")}
                            </Button>
                        </span>
                    </footer>
                </div>
            </Dropdown>
        </>
    );
}
