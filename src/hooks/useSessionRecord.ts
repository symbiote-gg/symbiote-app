import { useQuery } from "@tanstack/react-query";

import { sessionRecordQuery } from "@/api/queries";

export function useSessionRecord() {
    return useQuery(sessionRecordQuery);
}
