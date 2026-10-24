import { useQuery } from "@tanstack/react-query";

import { databaseStatsQuery } from "@/api/queries";

export function useDatabaseStats() {
    return useQuery(databaseStatsQuery);
}
