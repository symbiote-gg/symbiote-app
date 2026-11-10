import { useQuery } from "@tanstack/react-query";

import { heroDetailQuery } from "@/api/queries";

export function useHeroDetail(heroId: number) {
    return useQuery(heroDetailQuery(heroId));
}
