import {
    type InfiniteData,
    infiniteQueryOptions,
    keepPreviousData,
} from "@tanstack/react-query";

import { portraitSrc } from "@/utils/portraits";
import {
    DEFAULT_REPLAY_SORT,
    NO_REPLAY_FILTERS,
    PAGE_SIZE,
    type Replay,
    type ReplayCursor,
    type ReplayFilters,
    type ReplayPage,
    type ReplaySort,
    type ReplaySortColumn,
    listReplays,
} from "../replays";
import { preloadImage } from "./preload";

export const REPLAY_LISTS_KEY = ["replays", "recent-replays", "list"] as const;

export type ReplayListData = InfiniteData<ReplayPage, ReplayCursor | null>;

export const isUnfiltered = (filters: ReplayFilters) =>
    filters.modes.length === 0 &&
    filters.maps.length === 0 &&
    filters.heroes.length === 0 &&
    filters.roles.length === 0 &&
    filters.win === null &&
    filters.from === null &&
    filters.to === null;

export const isDefaultList = (filters: ReplayFilters, sort: ReplaySort) =>
    isUnfiltered(filters) &&
    sort.column === DEFAULT_REPLAY_SORT.column &&
    sort.desc === DEFAULT_REPLAY_SORT.desc;

const SORT_VALUE: Record<ReplaySortColumn, (replay: Replay) => number | null> =
    {
        played: (replay) => Math.floor(Date.parse(replay.timestamp) / 1000),
        gameTime: (replay) => replay.duration,
        heroDamage: (replay) => replay.ownerHeroDamage,
    };

const pagePortraits = (page: ReplayPage) =>
    new Set(
        page.replays.flatMap((replay) => [
            replay.heroPortrait && portraitSrc(replay.heroPortrait, "md"),
            ...replay.players.map(
                (player) =>
                    player.heroPortrait &&
                    portraitSrc(player.heroPortrait, "xs"),
            ),
        ]),
    );

export const replaysQuery = (
    filters = NO_REPLAY_FILTERS,
    sort = DEFAULT_REPLAY_SORT,
) =>
    infiniteQueryOptions({
        queryKey: [...REPLAY_LISTS_KEY, filters, sort],
        // The full list is kept while off screen, so coming back doesn't show an empty list
        // while it refetches. Filtered and sorted ones expire, or every combination tried
        // would stay cached and be refetched on each ingest.
        gcTime: isDefaultList(filters, sort) ? Infinity : undefined,
        placeholderData: keepPreviousData,
        // Resolve with the portraits decoded, so rows don't paint them blank as they swap in.
        queryFn: async ({ pageParam }) => {
            const page = await listReplays(filters, sort, pageParam, PAGE_SIZE);
            await Promise.all(
                Array.from(pagePortraits(page), (src) =>
                    src ? preloadImage(src) : undefined,
                ),
            );
            return page;
        },
        initialPageParam: null as ReplayCursor | null,
        getNextPageParam: (last, all): ReplayCursor | undefined => {
            const replays = all.flatMap((page) => page.replays);
            const tail = replays[replays.length - 1];
            // A fetched page coming back empty means nothing lists after the tail, even
            // if `total` says otherwise.
            if (
                !tail ||
                last.replays.length === 0 ||
                replays.length >= last.total
            ) {
                return undefined;
            }
            return { value: SORT_VALUE[sort.column](tail), id: tail.id };
        },
    });
