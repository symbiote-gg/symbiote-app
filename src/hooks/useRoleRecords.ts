import { useQuery } from "@tanstack/react-query";

import { type ScoreScope, getRoleRecords } from "@/api/stats";

export function useRoleRecords(scope: ScoreScope) {
    return useQuery({
        queryKey: ["stats", "roles", scope],
        gcTime: Infinity,
        queryFn: () => getRoleRecords(scope),
    });
}
