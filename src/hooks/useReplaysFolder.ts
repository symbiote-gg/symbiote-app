import { useQuery } from "@tanstack/react-query";

import { replaysFolderQuery } from "@/api/queries";

export function useReplaysFolder() {
    return useQuery(replaysFolderQuery);
}
