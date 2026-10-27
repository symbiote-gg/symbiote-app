import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
    REPLAY_LISTS_KEY,
    type ReplayListData,
    STANDOUTS_KEY,
    applyIngested,
    isDefaultList,
    replayQuery,
} from "@/api/queries";
import {
    type ReplayFilters,
    type ReplayIngested,
    type ReplaySort,
    subscribeIngest,
} from "@/api/replays";

const FLUSH_MS = 250;
// Stats scan every stored replay, so refreshing them on each flush slows ingestion down.
const STATS_MS = 5000;
const STATS_KEY = ["stats"];
// Refetching a filtered list reloads every page it has loaded, so a bulk ingest
// refetches it at most this often, the first batch right away.
const FILTERED_MS = 5000;

const isDefaultListKey = (key: readonly unknown[]) =>
    isDefaultList(
        key[REPLAY_LISTS_KEY.length] as ReplayFilters,
        key[REPLAY_LISTS_KEY.length + 1] as ReplaySort,
    );

export function useIngestInvalidation() {
    const queryClient = useQueryClient();

    useEffect(() => {
        let batch: ReplayIngested[] = [];
        let flushTimer: ReturnType<typeof setTimeout> | undefined;
        let statsTimer: ReturnType<typeof setTimeout> | undefined;
        let filteredTimer: ReturnType<typeof setTimeout> | undefined;
        let filteredAt = 0;

        // Invalidating mid-fetch would either restart it, starving slow queries while
        // replays stream in, or join it and miss the replays stored since it started.
        const refreshStats = () => {
            if (queryClient.isFetching({ queryKey: STATS_KEY })) {
                statsTimer = setTimeout(refreshStats, FLUSH_MS);
                return;
            }
            statsTimer = undefined;
            queryClient.invalidateQueries({ queryKey: STATS_KEY });
        };

        const refreshFiltered = () => {
            if (queryClient.isFetching({ queryKey: REPLAY_LISTS_KEY })) {
                filteredTimer = setTimeout(refreshFiltered, FLUSH_MS);
                return;
            }

            filteredTimer = undefined;
            filteredAt = Date.now();

            queryClient.invalidateQueries({
                queryKey: REPLAY_LISTS_KEY,
                predicate: ({ queryKey }) => !isDefaultListKey(queryKey),
            });
        };

        const flush = () => {
            // A page landing after the patch would overwrite it, so wait for it to settle.
            if (queryClient.isFetching({ queryKey: REPLAY_LISTS_KEY })) {
                flushTimer = setTimeout(flush, FLUSH_MS);
                return;
            }
            flushTimer = undefined;
            const ingested = batch;
            batch = [];

            const lists = queryClient.getQueriesData<ReplayListData>({
                queryKey: REPLAY_LISTS_KEY,
            });
            for (const [key, data] of lists) {
                if (!data || !isDefaultListKey(key)) continue;
                queryClient.setQueryData(key, applyIngested(data, ingested));
            }
            filteredTimer ??= setTimeout(
                refreshFiltered,
                Math.max(0, filteredAt + FILTERED_MS - Date.now()),
            );
            for (const { replay, removed, refreshed } of ingested) {
                if (removed !== null) {
                    queryClient.removeQueries({
                        queryKey: replayQuery(removed).queryKey,
                    });
                }
                if (refreshed) {
                    queryClient.invalidateQueries({
                        queryKey: replayQuery(replay.id).queryKey,
                    });
                }
            }
            // New games shift the hero baselines the standouts are judged against.
            queryClient.invalidateQueries({ queryKey: STANDOUTS_KEY });
            statsTimer ??= setTimeout(refreshStats, STATS_MS);
        };

        const onIngested = (message: ReplayIngested) => {
            batch.push(message);
            flushTimer ??= setTimeout(flush, FLUSH_MS);
        };

        const unsubscribe = subscribeIngest(onIngested);

        // The ingester starts before the frontend subscribes, so a list or stats fetched
        // meanwhile can miss replays that were never streamed to patch them in.
        const onSubscribed = () => {
            queryClient.invalidateQueries({ queryKey: REPLAY_LISTS_KEY });
            queryClient.invalidateQueries({ queryKey: STATS_KEY });
        };
        unsubscribe.then(onSubscribed);

        return () => {
            clearTimeout(flushTimer);
            clearTimeout(statsTimer);
            clearTimeout(filteredTimer);
            unsubscribe.then((fn) => fn());
        };
    }, [queryClient]);
}
