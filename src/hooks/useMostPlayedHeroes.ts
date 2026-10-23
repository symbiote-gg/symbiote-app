import { useQuery } from "@tanstack/react-query";

import { getMostPlayedHeroes } from "@/api/stats";

export function useMostPlayedHeroes(limit: number) {
    return useQuery({
        queryKey: ["stats", "most-played-heroes", limit],
        gcTime: Infinity,
        queryFn: () => getMostPlayedHeroes(limit),
    });
}
