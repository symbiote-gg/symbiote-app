import { useQuery } from "@tanstack/react-query";

import { getHeroDetail } from "@/api/heroes";

export function useHeroDetail(heroId: number) {
    return useQuery({
        queryKey: ["stats", "heroes", "detail", heroId],
        queryFn: () => getHeroDetail(heroId),
    });
}
