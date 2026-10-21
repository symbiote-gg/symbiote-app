import { useQuery } from "@tanstack/react-query";

import { mostPlayedHeroesQuery } from "@/api/queries";

export function useMostPlayedHeroes(limit: number) {
    return useQuery(mostPlayedHeroesQuery(limit));
}
