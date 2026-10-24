import { useQuery } from "@tanstack/react-query";

import { getMostPlayedHeroes } from "@/api/stats";

/** The backend clamps the limit to `MAX_MOST_PLAYED_HEROES`, so raise both together. */
export const ALL_HEROES = 200;

export function useMostPlayedHeroes(limit: number) {
    return useQuery({
        queryKey: ["stats", "most-played-heroes", limit],
        gcTime: Infinity,
        queryFn: () => getMostPlayedHeroes(limit),
    });
}
