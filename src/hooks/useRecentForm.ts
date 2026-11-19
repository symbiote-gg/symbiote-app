import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type ScoreScope, getRecentForm } from "@/api/stats";

export function useRecentForm(scope: ScoreScope) {
    return useQuery({
        queryKey: ["stats", "recent-form", scope],
        gcTime: Infinity,
        // The windows end at the backend's now, so they slide with the clock too.
        staleTime: 60 * 60 * 1000,
        queryFn: () => getRecentForm(scope),
        placeholderData: keepPreviousData,
    });
}
