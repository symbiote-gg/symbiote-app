import { useQuery } from "@tanstack/react-query";

import { getProfileBests } from "@/api/stats";

export function useProfileBests() {
    return useQuery({
        queryKey: ["stats", "profile-bests"],
        gcTime: Infinity,
        queryFn: getProfileBests,
    });
}
