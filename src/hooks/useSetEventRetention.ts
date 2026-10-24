import { useMutation, useQueryClient } from "@tanstack/react-query";

import { databaseStatsQuery, settingsQuery } from "@/api/queries";
import { setEventRetention } from "@/api/settings";

const REPLAY_DETAILS_KEY = ["replays", "detail"];
const RETENTION_PREVIEWS_KEY = ["retentionPreview"];

export function useSetEventRetention() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: setEventRetention,
        onSuccess: (_, years) => {
            // Set rather than refetched, so the old value can't show again meanwhile.
            queryClient.setQueryData(settingsQuery.queryKey, {
                eventRetentionYears: years,
            });

            return Promise.all([
                queryClient.invalidateQueries({
                    queryKey: databaseStatsQuery.queryKey,
                }),
                queryClient.invalidateQueries({
                    queryKey: RETENTION_PREVIEWS_KEY,
                }),
                queryClient.invalidateQueries({
                    queryKey: REPLAY_DETAILS_KEY,
                }),
            ]);
        },
    });
}
