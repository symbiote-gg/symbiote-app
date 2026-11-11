import { noop, useQueryClient } from "@tanstack/react-query";

import { heroDetailQuery } from "@/api/queries";

export function usePrefetchHero(heroId: number) {
    const queryClient = useQueryClient();

    return () => {
        queryClient.query(heroDetailQuery(heroId)).catch(noop);
    };
}
