import { useQuery } from "@tanstack/react-query";

import { type ScoreScope, getPartySizes } from "@/api/stats";

export function usePartySizes(scope: ScoreScope) {
    return useQuery({
        queryKey: ["stats", "party-sizes", scope],
        gcTime: Infinity,
        queryFn: () => getPartySizes(scope),
    });
}
