import { queryOptions } from "@tanstack/react-query";

import {
    getDatabaseStats,
    getReplaysFolder,
    getSettings,
    previewEventRetention,
} from "../settings";
import { queryKeys } from "./keys";

export const settingsQuery = queryOptions({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
});

export const databaseStatsQuery = queryOptions({
    queryKey: [...queryKeys.stats, "database"],
    staleTime: 0,
    queryFn: getDatabaseStats,
});

export const replaysFolderQuery = queryOptions({
    queryKey: queryKeys.replaysFolder,
    queryFn: getReplaysFolder,
});

export const retentionPreviewQuery = (years: number | null) =>
    queryOptions({
        queryKey: [...queryKeys.retentionPreviews, years],
        staleTime: 0,
        queryFn: () => previewEventRetention(years),
    });
