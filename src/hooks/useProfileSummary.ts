import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { getProfileSummary } from "@/api/stats";

export function useProfileSummary(since = dayjs().startOf("day").toDate()) {
    return useQuery({
        queryKey: ["stats", "profile", since.getTime()],
        gcTime: Infinity,
        queryFn: () => getProfileSummary(since),
    });
}
