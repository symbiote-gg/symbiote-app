import { queryOptions } from "@tanstack/react-query";

import { getSessionBests, getSessionRecord } from "../stats";

export const sessionRecordQuery = queryOptions({
    queryKey: ["stats", "session"],
    gcTime: Infinity,
    queryFn: getSessionRecord,
});

export const sessionBestsQuery = queryOptions({
    queryKey: ["stats", "session-bests"],
    gcTime: Infinity,
    queryFn: getSessionBests,
});
