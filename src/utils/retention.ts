import type { DatabaseStats, RetentionPreview } from "@/api/settings";

export const RETENTIONS = ["1", "2", "5", "forever"] as const;

export type Retention = (typeof RETENTIONS)[number];

export const toYears = (retention: Retention) =>
    retention === "forever" ? null : Number(retention);

export const toRetention = (years: number | null): Retention =>
    RETENTIONS.find((retention) => toYears(retention) === years) ?? "5";

export const RETENTION_YEARS = RETENTIONS.map(toYears);

export const keptFor = (years: number | null) => years ?? Infinity;

export function retentionCutoff(years: number | null) {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - (years ?? 0));
    return cutoff;
}

export const bytesPerGame = (stats: DatabaseStats | undefined) =>
    stats && stats.gamesWithEvents > 0
        ? stats.bytes / stats.gamesWithEvents
        : 0;

export type RetentionChange = {
    years: number | null;
    kind: "delete" | "restore" | "shorter" | "longer";
    preview: RetentionPreview;
    freed: number;
    restored: number;
    cutoff: Date;
};

export function buildRetentionChange(
    pending: Retention | null,
    current: number | null,
    preview: RetentionPreview | undefined,
    perGame: number,
): RetentionChange | null {
    if (pending === null || preview === undefined) return null;

    const years = toYears(pending);

    let kind: RetentionChange["kind"] = "longer";
    if (preview.expiring > 0) kind = "delete";
    else if (preview.restorable > 0) kind = "restore";
    else if (keptFor(years) < keptFor(current)) kind = "shorter";

    return {
        years,
        kind,
        preview,
        freed: preview.expiring * perGame,
        restored: preview.restorable * perGame,
        cutoff: retentionCutoff(years),
    };
}
