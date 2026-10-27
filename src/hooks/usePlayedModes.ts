import { useQuery } from "@tanstack/react-query";

import { getPlayedModes } from "@/api/stats";

export function usePlayedModes() {
    return useQuery({
        queryKey: ["stats", "played-modes"],
        gcTime: Infinity,
        queryFn: getPlayedModes,
    });
}
