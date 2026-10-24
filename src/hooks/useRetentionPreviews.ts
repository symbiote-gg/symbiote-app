import { useQueries } from "@tanstack/react-query";

import { retentionPreviewQuery } from "@/api/queries";

export function useRetentionPreviews(years: (number | null)[]) {
    return useQueries({ queries: years.map(retentionPreviewQuery) });
}
