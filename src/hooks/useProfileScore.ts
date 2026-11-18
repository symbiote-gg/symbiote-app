import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { profileScoreQuery } from "@/api/queries";
import type { ScoreScope } from "@/api/stats";

export function useProfileScore(scope: ScoreScope) {
    return useQuery({
        ...profileScoreQuery(scope),
        placeholderData: keepPreviousData,
    });
}
