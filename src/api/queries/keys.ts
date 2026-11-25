/**
 * The key families every query is filed under. A family is a key prefix, so
 * invalidating it reaches every query in it.
 */
export const queryKeys = {
    stats: ["stats"],
    replayLists: ["replays", "recent-replays", "list"],
    replayDetails: ["replays", "detail"],
    standouts: ["replays", "standouts"],
    settings: ["settings"],
    replaysFolder: ["replaysFolder"],
    retentionPreviews: ["retentionPreview"],
    licenses: ["licenses"],
} as const;

export type QueryFamily = keyof typeof queryKeys;

/**
 * How a family's queries follow the replays the ingester stores:
 * - `patched`: the full list gets them spliced in, filtered and sorted ones refetch
 *   at most every few seconds.
 * - `throttled`: refetched at most every few seconds, as each one scans every game.
 * - `eachBatch`: refetched with each batch of stored replays.
 * - `reingested`: a replay's query refetches when it's ingested again.
 * - `never`: an ingest doesn't change them.
 */
export type IngestRefresh =
    "patched" | "throttled" | "eachBatch" | "reingested" | "never";

export const INGEST_REFRESH: Record<QueryFamily, IngestRefresh> = {
    stats: "throttled",
    replayLists: "patched",
    replayDetails: "reingested",
    // New games shift the hero baselines the standouts are judged against.
    standouts: "eachBatch",
    settings: "never",
    replaysFolder: "never",
    retentionPreviews: "never",
    licenses: "never",
};

/** The keys of the families refreshed after an ingest as `refresh` says. */
export const familiesRefreshed = (refresh: IngestRefresh) =>
    (Object.keys(INGEST_REFRESH) as QueryFamily[])
        .filter((family) => INGEST_REFRESH[family] === refresh)
        .map((family) => queryKeys[family]);
