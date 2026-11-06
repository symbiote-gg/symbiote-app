import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getHeroList } from "@/api/heroes";
import type { ReplayFilters } from "@/api/replays";

export function useHeroList(filters: ReplayFilters) {
    return useQuery({
        queryKey: ["stats", "heroes", "list", filters],
        placeholderData: keepPreviousData,
        queryFn: () => getHeroList(filters),
    });
}
