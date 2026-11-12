import { noop, useQueryClient } from "@tanstack/react-query";

import { replayQuery, standoutsQuery } from "@/api/queries";
import { useHoverPrefetch } from "./useHoverPrefetch";

export function usePrefetchReplay(id: number) {
    const queryClient = useQueryClient();

    return useHoverPrefetch(() => {
        queryClient.query(replayQuery(id)).catch(noop);
        queryClient.query(standoutsQuery(id)).catch(noop);
    });
}
