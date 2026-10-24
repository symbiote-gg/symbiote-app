import { invoke } from "@tauri-apps/api/core";

export type Settings = {
    /** `null` keeps timelines forever. */
    eventRetentionYears: number | null;
};

export type RetentionPreview = {
    expiring: number;
    /** Expiring games whose replay file is gone, so their timeline can't come back. */
    lost: number;
    restorable: number;
    /** Purged games in range whose replay file is gone, so their timeline stays purged. */
    unrestorable: number;
};

export type DatabaseStats = {
    bytes: number;
    gamesWithEvents: number;
    gamesLastYear: number;
};

export const getSettings = () => invoke<Settings>("get_settings");

export const previewEventRetention = (years: number | null) =>
    invoke<RetentionPreview>("preview_event_retention", { years });

export const setEventRetention = (years: number | null) =>
    invoke<void>("set_event_retention", { years });

export const getDatabaseStats = () =>
    invoke<DatabaseStats>("get_database_stats");
