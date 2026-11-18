import { queryOptions } from "@tanstack/react-query";

import { type ScoreScope, getProfileScore } from "../stats";

export const profileScoreQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: ["stats", "profile-score", scope],
        gcTime: Infinity,
        // With its scope, as a new scope's query shows the last one's score
        // until its own comes.
        queryFn: async () => ({ scope, ...(await getProfileScore(scope)) }),
    });
