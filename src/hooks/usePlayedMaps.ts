import { useQuery } from "@tanstack/react-query";

import { getPlayedMaps } from "@/api/stats";

export function usePlayedMaps() {
    return useQuery({
        queryKey: ["stats", "played-maps"],
        gcTime: Infinity,
        queryFn: getPlayedMaps,
    });
}
