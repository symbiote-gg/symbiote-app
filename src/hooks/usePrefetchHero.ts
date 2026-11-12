import { noop, useQueryClient } from "@tanstack/react-query";

import { heroDetailQuery } from "@/api/queries";
import { useHoverPrefetch } from "./useHoverPrefetch";

export function usePrefetchHero(heroId: number) {
    const queryClient = useQueryClient();

    return useHoverPrefetch(() => {
        queryClient.query(heroDetailQuery(heroId)).catch(noop);
    });
}
