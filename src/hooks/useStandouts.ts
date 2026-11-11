import { useQuery } from "@tanstack/react-query";

import { standoutsQuery } from "@/api/queries";

export function useStandouts(id: number) {
    return useQuery(standoutsQuery(id));
}
