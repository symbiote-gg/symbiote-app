import { queryOptions } from "@tanstack/react-query";

import {
    getDatabaseStats,
    getReplaysFolder,
    getSettings,
    previewEventRetention,
} from "../settings";

export const settingsQuery = queryOptions({
    queryKey: ["settings"],
    queryFn: getSettings,
});

export const databaseStatsQuery = queryOptions({
    queryKey: ["stats", "database"],
    staleTime: 0,
    queryFn: getDatabaseStats,
});

export const replaysFolderQuery = queryOptions({
    queryKey: ["stats", "replaysFolder"],
    queryFn: getReplaysFolder,
});

export const retentionPreviewQuery = (years: number | null) =>
    queryOptions({
        queryKey: ["retentionPreview", years],
        staleTime: 0,
        queryFn: () => previewEventRetention(years),
    });
