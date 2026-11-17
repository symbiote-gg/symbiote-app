import { useQuery } from "@tanstack/react-query";

import { getProfileCareer } from "@/api/stats";

export function useProfileCareer() {
    return useQuery({
        queryKey: ["stats", "profile-career"],
        gcTime: Infinity,
        queryFn: getProfileCareer,
    });
}
