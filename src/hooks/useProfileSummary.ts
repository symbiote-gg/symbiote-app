import { useQuery } from "@tanstack/react-query";

import { profileSummaryQuery } from "@/api/queries";
import { startOfToday } from "@/utils/dates";

export function useProfileSummary(since = startOfToday()) {
    return useQuery(profileSummaryQuery(since));
}
