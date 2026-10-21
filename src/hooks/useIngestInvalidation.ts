import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { applyIngested, replayQuery, replaysQuery } from "@/api/queries";
import { type ReplayIngested, subscribeIngest } from "@/api/replays";

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
            if (queryClient.isFetching({ queryKey: replaysQuery.queryKey })) {
                flushTimer = setTimeout(flush, FLUSH_MS);
                return;
            }
            flushTimer = undefined;
            const ingested = batch;
            batch = [];

            queryClient.setQueryData(
                replaysQuery.queryKey,
                (data) => data && applyIngested(data, ingested),
            );
            for (const { removed } of ingested) {
                if (removed !== null) {
                    queryClient.removeQueries({
                        queryKey: replayQuery(removed).queryKey,
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
