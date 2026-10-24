import type { HeroRole, Mode, ReplayFilters } from "@/api/replays";
import { ANY_TIME, type DateRange, rangeBounds } from "@/utils/date-range";

export type FilterState = {
    modes: Mode[];
    win: boolean | null;
    date: DateRange;
    roles: HeroRole[];
    heroes: number[];
};

export const NO_FILTERS: FilterState = {
    modes: [],
    win: null,
    date: ANY_TIME,
    roles: [],
    heroes: [],
};

export const activeFilters = (filters: FilterState) =>
    [
        filters.modes.length > 0,
        filters.win !== null,
        filters.date.preset !== "any",
        filters.roles.length > 0,
        filters.heroes.length > 0,
    ].filter(Boolean).length;

export const isFiltered = (filters: FilterState) => activeFilters(filters) > 0;

/**
 * Presets end today, so they leave `to` open: a bound at the next midnight would go stale
 * if the app stays open past it, and hide the games played after.
 */
export function toReplayFilters(filters: FilterState): ReplayFilters {
    const bounds = rangeBounds(filters.date);
    const custom = filters.date.preset === "custom";
    return {
        modes: filters.modes,
        heroes: filters.heroes,
        roles: filters.roles,
        win: filters.win,
        from: bounds?.from.toISOString() ?? null,
        to: (custom && bounds?.to.toISOString()) || null,
    };
}
