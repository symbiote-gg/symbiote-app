import { useMutation, useQueryClient } from "@tanstack/react-query";

import { databaseStatsQuery, queryKeys, settingsQuery } from "@/api/queries";
import { setEventRetention } from "@/api/settings";

export function useSetEventRetention() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: setEventRetention,
        onSuccess: (_, years) => {
            // Set rather than refetched, so the old value can't show again meanwhile.
            queryClient.setQueryData(
                settingsQuery.queryKey,
                (settings) =>
                    settings && { ...settings, eventRetentionYears: years },
            );

            return Promise.all([
                queryClient.invalidateQueries({
                    queryKey: databaseStatsQuery.queryKey,
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.retentionPreviews,
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.replayDetails,
                }),
            ]);
        },
    });
}
