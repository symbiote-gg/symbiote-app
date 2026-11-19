import { queryOptions } from "@tanstack/react-query";

import { getSessionRecord } from "../stats";

export const sessionRecordQuery = queryOptions({
    queryKey: ["stats", "session"],
    gcTime: Infinity,
    queryFn: getSessionRecord,
});
