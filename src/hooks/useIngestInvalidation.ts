import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
    REPLAY_LISTS_KEY,
    type ReplayListData,
    applyIngested,
    isUnfiltered,
    replayQuery,
} from "@/api/queries";
import {
    type ReplayFilters,
    type ReplayIngested,
    subscribeIngest,
} from "@/api/replays";

const FLUSH_MS = 250;
// Stats scan every stored replay, so refreshing them on each flush slows ingestion down.
const STATS_MS = 5000;
const STATS_KEY = ["stats"];

export function useIngestInvalidation() {
    const queryClient = useQueryClient();

    useEffect(() => {
        let batch: ReplayIngested[] = [];
        let flushTimer: ReturnType<typeof setTimeout> | undefined;
        let statsTimer: ReturnType<typeof setTimeout> | undefined;

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
                if (!data) continue;
                const filters = key[REPLAY_LISTS_KEY.length] as ReplayFilters;
                if (isUnfiltered(filters)) {
                    queryClient.setQueryData(
                        key,
                        applyIngested(data, ingested),
                    );
                } else {
                    queryClient.invalidateQueries({
                        queryKey: key,
                        exact: true,
                    });
                }
            }
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
            statsTimer ??= setTimeout(refreshStats, STATS_MS);
        };

        const onIngested = (message: ReplayIngested) => {
            batch.push(message);
            flushTimer ??= setTimeout(flush, FLUSH_MS);
        };

        const unsubscribe = subscribeIngest(onIngested);

        return () => {
            clearTimeout(flushTimer);
            clearTimeout(statsTimer);
            unsubscribe.then((fn) => fn());
        };
    }, [queryClient]);
}
