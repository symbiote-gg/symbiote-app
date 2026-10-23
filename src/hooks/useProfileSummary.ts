import { useQuery } from "@tanstack/react-query";

import { getProfileSummary } from "@/api/stats";
import { startOfToday } from "@/utils/dates";

export function useProfileSummary(since = startOfToday()) {
    return useQuery({
        queryKey: ["stats", "profile", since.getTime()],
        gcTime: Infinity,
        queryFn: () => getProfileSummary(since),
    });
}
