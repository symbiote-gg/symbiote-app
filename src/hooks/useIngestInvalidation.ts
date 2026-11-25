import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { type IngestProgress, watchIngestProgress } from "@/api/ingest";
import {
    type ReplayListData,
    applyIngested,
    familiesRefreshed,
    isDefaultList,
    profileScoreQuery,
    queryKeys,
} from "@/api/queries";
import {
    type ReplayFilters,
    type ReplayIngested,
    type ReplaySort,
    subscribeIngest,
} from "@/api/replays";
import { toPhase } from "./useIngestProgress";

const FLUSH_MS = 1000;
// Throttled queries scan every stored replay, so refreshing them on each flush slows
// ingestion down.
const THROTTLED_MS = 5000;
// Refetching a filtered list reloads every page it has loaded, so a bulk ingest
// refetches it at most this often, the first batch right away.
const FILTERED_MS = 5000;

const isDefaultListKey = (key: readonly unknown[]) =>
    isDefaultList(
        key[queryKeys.replayLists.length] as ReplayFilters,
        key[queryKeys.replayLists.length + 1] as ReplaySort,
    );

export function useIngestInvalidation() {
    const queryClient = useQueryClient();

    useEffect(() => {
        let batch: ReplayIngested[] = [];
        let flushTimer: ReturnType<typeof setTimeout> | undefined;
        let throttledTimer: ReturnType<typeof setTimeout> | undefined;
        let filteredTimer: ReturnType<typeof setTimeout> | undefined;
        let filteredAt = 0;
        let ingesting = true;

        // Scoring reads every game, so it starts before a page asks for it, but only
        // once the ingest and its last stats refresh are over, or it would slow the
        // ingest down for a score that is stale by its end. Only the scope every page
        // header reads, as each one is a full scan.
        const warmScore = () => {
            const pending =
                batch.length > 0 ||
                flushTimer !== undefined ||
                throttledTimer !== undefined;
            if (ingesting || pending) return;

            queryClient.prefetchQuery(profileScoreQuery("all"));
        };

        // Invalidating mid-fetch would either restart it, starving slow queries while
        // replays stream in, or join it and miss the replays stored since it started.
        const refreshThrottled = () => {
            const families = familiesRefreshed("throttled");
            const fetching = families.some((queryKey) =>
                queryClient.isFetching({ queryKey }),
            );
            if (fetching) {
                throttledTimer = setTimeout(refreshThrottled, FLUSH_MS);
                return;
            }

            throttledTimer = undefined;
            for (const queryKey of families) {
                queryClient.invalidateQueries({ queryKey });
            }
            warmScore();
        };

        const refreshFiltered = () => {
            if (queryClient.isFetching({ queryKey: queryKeys.replayLists })) {
                filteredTimer = setTimeout(refreshFiltered, FLUSH_MS);
                return;
            }

            filteredTimer = undefined;
            filteredAt = Date.now();

            queryClient.invalidateQueries({
                queryKey: queryKeys.replayLists,
                predicate: ({ queryKey }) => !isDefaultListKey(queryKey),
            });
        };

        const flush = () => {
            // A page landing after the patch would overwrite it, so wait for it to settle.
            if (queryClient.isFetching({ queryKey: queryKeys.replayLists })) {
                flushTimer = setTimeout(flush, FLUSH_MS);
                return;
            }
            flushTimer = undefined;
            const ingested = batch;
            batch = [];

            const lists = queryClient.getQueriesData<ReplayListData>({
                queryKey: queryKeys.replayLists,
            });
            for (const [key, data] of lists) {
                if (!data || !isDefaultListKey(key)) continue;
                queryClient.setQueryData(key, applyIngested(data, ingested));
            }
            if (filteredTimer === undefined) {
                filteredTimer = setTimeout(
                    refreshFiltered,
                    Math.max(0, filteredAt + FILTERED_MS - Date.now()),
                );
            }
            for (const family of familiesRefreshed("reingested")) {
                for (const { replay, refreshed } of ingested) {
                    if (!refreshed) continue;
                    queryClient.invalidateQueries({
                        queryKey: [...family, replay.id],
                    });
                }
            }
            for (const queryKey of familiesRefreshed("eachBatch")) {
                queryClient.invalidateQueries({ queryKey });
            }
            if (throttledTimer === undefined) {
                throttledTimer = setTimeout(refreshThrottled, THROTTLED_MS);
            }
        };

        const onIngested = (message: ReplayIngested) => {
            batch.push(message);
            if (flushTimer === undefined) {
                flushTimer = setTimeout(flush, FLUSH_MS);
            }
        };

        const onProgress = (progress: IngestProgress) => {
            ingesting = toPhase(progress) !== null;
            warmScore();
        };

        const unsubscribe = subscribeIngest(onIngested);
        const unwatch = watchIngestProgress(onProgress);

        // The ingester starts before the frontend subscribes, so a list or stats fetched
        // meanwhile can miss replays that were never streamed to patch them in.
        const onSubscribed = () => {
            for (const refresh of ["patched", "throttled"] as const) {
                for (const queryKey of familiesRefreshed(refresh)) {
                    queryClient.invalidateQueries({ queryKey });
                }
            }
            warmScore();
        };
        unsubscribe.then(onSubscribed);

        return () => {
            clearTimeout(flushTimer);
            clearTimeout(throttledTimer);
            clearTimeout(filteredTimer);
            unsubscribe.then((fn) => fn());
            unwatch();
        };
    }, [queryClient]);
}
