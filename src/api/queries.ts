import {
    type InfiniteData,
    QueryClient,
    infiniteQueryOptions,
    keepPreviousData,
    noop,
    queryOptions,
} from "@tanstack/react-query";

import {
    NO_REPLAY_FILTERS,
    PAGE_SIZE,
    type Replay,
    type ReplayCursor,
    type ReplayFilters,
    type ReplayIngested,
    type ReplayPage,
    getReplay,
    listReplays,
} from "./replays";
import {
    getDatabaseStats,
    getReplaysFolder,
    getSettings,
    previewEventRetention,
} from "./settings";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data only changes when the ingester stores replays, which invalidates it.
            staleTime: Infinity,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: false,
        },
    },
});

/** Prefixes the key of every `replaysQuery`, whatever its filters. */
export const REPLAY_LISTS_KEY = ["replays", "list"] as const;

export type ReplayListData = InfiniteData<ReplayPage, ReplayCursor | null>;

export const isUnfiltered = (filters: ReplayFilters) =>
    filters.modes.length === 0 &&
    filters.heroes.length === 0 &&
    filters.roles.length === 0 &&
    filters.win === null &&
    filters.from === null &&
    filters.to === null;

const PRELOAD_TIMEOUT_MS = 250;

const preloadImage = (src: string) => {
    const img = new Image();
    img.src = src;
    return Promise.race([
        img.decode().catch(noop),
        new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
    ]);
};

const pagePortraits = (page: ReplayPage) =>
    new Set(
        page.replays.flatMap((replay) => [
            replay.heroPortrait,
            ...replay.players.map((player) => player.heroPortrait),
        ]),
    );

export const replaysQuery = (filters = NO_REPLAY_FILTERS) =>
    infiniteQueryOptions({
        queryKey: [...REPLAY_LISTS_KEY, filters],
        // The full list is kept while off screen, so coming back doesn't show an empty list
        // while it refetches. Filtered ones expire, or every combination tried would stay
        // cached and be patched on each ingest.
        gcTime: isUnfiltered(filters) ? Infinity : undefined,
        // Keeps the current list up while the one for new filters loads.
        placeholderData: keepPreviousData,
        // Resolve with the portraits decoded, so rows don't paint them blank as they swap in.
        queryFn: async ({ pageParam }) => {
            const page = await listReplays(filters, pageParam, PAGE_SIZE);
            await Promise.all(
                Array.from(pagePortraits(page), (portrait) =>
                    portrait
                        ? preloadImage(`/game/heroportraits/${portrait}`)
                        : undefined,
                ),
            );
            return page;
        },
        initialPageParam: null as ReplayCursor | null,
        getNextPageParam: (last, all): ReplayCursor | undefined => {
            const replays = all.flatMap((page) => page.replays);
            const tail = replays[replays.length - 1];
            if (!tail || replays.length >= last.total) return undefined;
            return { timestamp: tail.timestamp, id: tail.id };
        },
    });

const listsBefore = (a: Replay, b: Replay) => {
    const diff = Date.parse(a.timestamp) - Date.parse(b.timestamp);
    return diff === 0 ? a.id > b.id : diff > 0;
};

/**
 * Splices the replays streamed by the ingester into the loaded pages of the unfiltered
 * `replaysQuery`, in list order, so they show up without refetching every page.
 * Filtered lists refetch instead, so only the backend decides what matches a filter.
 *
 * A replay sorting after the last loaded one is left for pagination to fetch, unless
 * everything is loaded. Either way no more replays stay loaded than before, or than a
 * page: a bulk ingest would otherwise pile every replay into the cache.
 */
export function applyIngested<TPageParam>(
    data: InfiniteData<ReplayPage, TPageParam>,
    batch: ReplayIngested[],
): InfiniteData<ReplayPage, TPageParam> {
    const pages = data.pages.map((page) => page.replays.slice());
    const last = pages[pages.length - 1];
    if (!last) return data;

    const limit = Math.max(
        pages.reduce((sum, page) => sum + page.length, 0),
        PAGE_SIZE,
    );

    let total = data.pages[0].total;
    for (const { replay, removed, total: ingestedTotal } of batch) {
        total = Math.max(total, ingestedTotal);

        if (removed !== null) {
            for (const page of pages) {
                const index = page.findIndex((r) => r.id === removed);
                if (index !== -1) page.splice(index, 1);
            }
        }

        const current = pages.find((page) =>
            page.some((r) => r.id === replay.id),
        );
        if (current) {
            current[current.findIndex((r) => r.id === replay.id)] = replay;
            continue;
        }

        const page = pages.find((page) =>
            page.some((r) => listsBefore(replay, r)),
        );
        if (page) {
            page.splice(
                page.findIndex((r) => listsBefore(replay, r)),
                0,
                replay,
            );
            continue;
        }

        const loaded = pages.reduce((sum, page) => sum + page.length, 0);
        if (loaded + 1 >= total) last.push(replay);
    }

    let excess = pages.reduce((sum, page) => sum + page.length, 0) - limit;
    for (let i = pages.length - 1; excess > 0 && i >= 0; i--) {
        const dropped = Math.min(excess, pages[i].length);
        pages[i].splice(pages[i].length - dropped, dropped);
        excess -= dropped;
    }

    let kept = pages.length;
    while (kept > 1 && pages[kept - 1].length === 0) kept--;

    return {
        pages: pages.slice(0, kept).map((replays) => ({ replays, total })),
        pageParams: data.pageParams.slice(0, kept),
    };
}

export function markSeenInPages<TPageParam>(
    data: InfiniteData<ReplayPage, TPageParam>,
    id: number,
): InfiniteData<ReplayPage, TPageParam> {
    return {
        ...data,
        pages: data.pages.map((page) => ({
            ...page,
            replays: page.replays.map((replay) =>
                replay.id === id ? { ...replay, isNew: false } : replay,
            ),
        })),
    };
}

export const replayQuery = (id: number) =>
    queryOptions({
        queryKey: ["replays", "detail", id],
        // Resolve with the header art decoded, so the page doesn't paint before it.
        queryFn: async () => {
            const replay = await getReplay(id);
            if (replay.mapLoadingScreen)
                await preloadImage(
                    `/game/loadingscreens/${replay.mapLoadingScreen}`,
                );
            return replay;
        },
    });

export const settingsQuery = queryOptions({
    queryKey: ["settings"],
    queryFn: getSettings,
});

export const databaseStatsQuery = queryOptions({
    queryKey: ["stats", "database"],
    staleTime: 0,
    queryFn: getDatabaseStats,
});

export const replaysFolderQuery = queryOptions({
    queryKey: ["stats", "replaysFolder"],
    queryFn: getReplaysFolder,
});

export const retentionPreviewQuery = (years: number | null) =>
    queryOptions({
        queryKey: ["retentionPreview", years],
        staleTime: 0,
        queryFn: () => previewEventRetention(years),
    });
