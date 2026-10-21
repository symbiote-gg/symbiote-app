import { useQuery } from "@tanstack/react-query";

import { replayQuery } from "@/api/queries";

export function useReplay(id: number) {
    return useQuery(replayQuery(id));
}
