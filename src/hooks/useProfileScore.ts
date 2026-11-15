import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type ScoreScope, getProfileScore } from "@/api/stats";

export function useProfileScore(scope: ScoreScope) {
    return useQuery({
        queryKey: ["stats", "profile-score", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        // With its scope, as a new scope's query shows the last one's score
        // until its own comes.
        queryFn: async () => ({ scope, ...(await getProfileScore(scope)) }),
    });
}
