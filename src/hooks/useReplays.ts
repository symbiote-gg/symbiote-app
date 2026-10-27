import { useInfiniteQuery } from "@tanstack/react-query";

import { replaysQuery } from "@/api/queries";
import type { ReplayFilters, ReplaySort } from "@/api/replays";

export function useReplays(filters?: ReplayFilters, sort?: ReplaySort) {
    return useInfiniteQuery(replaysQuery(filters, sort));
}
