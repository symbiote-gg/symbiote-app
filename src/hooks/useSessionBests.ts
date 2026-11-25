import { useQuery } from "@tanstack/react-query";

import { sessionBestsQuery } from "@/api/queries";

export function useSessionBests() {
    return useQuery(sessionBestsQuery);
}
