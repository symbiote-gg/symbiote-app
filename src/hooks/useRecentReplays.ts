import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

import { ReplayPage } from "@/api/replays";
import { useIngesting } from "@/hooks/useIngestProgress";

const RETRY_MS = 3000;

export function useRecentReplays(limit: number) {
    const ingesting = useIngesting();

    const query = useQuery({
        queryKey: ["recent-replays", limit],
        queryFn: async () => {
            return invoke<ReplayPage>("list_replays", { limit });
        },
        staleTime: 0,
        refetchInterval: (query) => {
            const loaded = query.state.data?.replays.length ?? 0;

            return ingesting && loaded < limit ? RETRY_MS : false;
        },
    });
    const { refetch } = query;

    useEffect(() => {
        if (!ingesting) refetch({ cancelRefetch: false });
    }, [ingesting, refetch]);

    return query;
}
