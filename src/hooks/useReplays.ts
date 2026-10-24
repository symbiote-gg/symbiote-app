import { useInfiniteQuery } from "@tanstack/react-query";

import { replaysQuery } from "@/api/queries";
import type { ReplayFilters } from "@/api/replays";

export function useReplays(filters?: ReplayFilters) {
    return useInfiniteQuery(replaysQuery(filters));
}
