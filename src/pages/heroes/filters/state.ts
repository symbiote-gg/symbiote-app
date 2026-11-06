import type { HeroSummary } from "@/api/heroes";
import type { HeroRole, Mode, ReplayFilters } from "@/api/replays";
import {
    NO_FILTERS as NO_REPLAY_FILTERS,
    toReplayFilters as toFilters,
} from "@/pages/replays/filters/state";
import { matches } from "@/ui/combobox/match";
import { ANY_TIME, type DateRange } from "@/utils/date-range";
import { kda, winRate } from "@/utils/hero-stats";

export const HERO_SORTS = ["games", "winRate", "kda", "played"] as const;

export type HeroSort = (typeof HERO_SORTS)[number];

export type FilterState = {
    modes: Mode[];
    date: DateRange;
    roles: HeroRole[];
    name: string;
    sort: HeroSort;
};

export const NO_FILTERS: FilterState = {
    modes: [],
    date: ANY_TIME,
    roles: [],
    name: "",
    sort: "games",
};

export const saved = { filters: NO_FILTERS };

export const activeFilters = (filters: FilterState) =>
    [
        filters.modes.length > 0,
        filters.date.preset !== "any",
        filters.roles.length > 0,
        filters.name.trim().length > 0,
    ].filter(Boolean).length;

export const isFiltered = (filters: FilterState) => activeFilters(filters) > 0;

/** Mode and date pick the games the stats sum up; role and name only hide heroes. */
export const toReplayFilters = (filters: FilterState): ReplayFilters =>
    toFilters({
        ...NO_REPLAY_FILTERS,
        modes: filters.modes,
        date: filters.date,
    });

const COMPARE: Record<HeroSort, (a: HeroSummary, b: HeroSummary) => number> = {
    games: (a, b) => b.games - a.games,
    winRate: (a, b) =>
        (winRate(b.wins, b.losses) ?? -1) - (winRate(a.wins, a.losses) ?? -1),
    kda: (a, b) => kda(b.takedowns, b.deaths) - kda(a.takedowns, a.deaths),
    played: (a, b) => Date.parse(b.lastPlayed) - Date.parse(a.lastPlayed),
};

/** The heroes `filters` keep, in its sort order; ties fall back to most played. */
export function pickHeroes(heroes: HeroSummary[], filters: FilterState) {
    const compare = COMPARE[filters.sort];

    return heroes
        .filter(
            (hero) =>
                (filters.roles.length === 0 ||
                    (!!hero.role && filters.roles.includes(hero.role))) &&
                matches(hero.name, filters.name),
        )
        .sort((a, b) => compare(a, b) || COMPARE.games(a, b));
}
