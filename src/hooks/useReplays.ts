import { useInfiniteQuery } from "@tanstack/react-query";

import { replaysQuery } from "@/api/queries";

export function useReplays() {
    return useInfiniteQuery(replaysQuery);
}
