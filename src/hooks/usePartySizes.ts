import { useQuery } from "@tanstack/react-query";

import { getPartySizes } from "@/api/stats";

export function usePartySizes() {
    return useQuery({
        queryKey: ["stats", "party-sizes"],
        gcTime: Infinity,
        queryFn: getPartySizes,
    });
}
