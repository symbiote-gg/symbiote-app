import { useQuery } from "@tanstack/react-query";

import { type ScoreScope, getProfileBests } from "@/api/stats";

export function useProfileBests(scope: ScoreScope) {
    return useQuery({
        queryKey: ["stats", "profile-bests", scope],
        gcTime: Infinity,
        queryFn: () => getProfileBests(scope),
    });
}
