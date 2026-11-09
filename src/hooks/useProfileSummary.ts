import { useQuery } from "@tanstack/react-query";

import { getProfileSummary } from "@/api/stats";

export function useProfileSummary() {
    return useQuery({
        queryKey: ["stats", "profile"],
        gcTime: Infinity,
        queryFn: getProfileSummary,
    });
}
