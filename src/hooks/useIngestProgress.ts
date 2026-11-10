import { useEffect, useState } from "react";

import { type IngestProgress, watchIngestProgress } from "@/api/ingest";

export type IngestPhase = {
    kind: "importing" | "updating";
    done: number;
    total: number;
};

function toPhase({ importing, updating }: IngestProgress): IngestPhase | null {
    if (importing.total > 0) return { kind: "importing", ...importing };
    if (updating.total > 0) return { kind: "updating", ...updating };

    return null;
}

export function useIngestProgress(): IngestPhase | null {
    const [progress, setProgress] = useState<IngestProgress | null>(null);

    useEffect(() => watchIngestProgress(setProgress), []);

    return progress && toPhase(progress);
}

export function useIngesting(): boolean {
    const [ingesting, setIngesting] = useState(false);

    useEffect(
        () =>
            watchIngestProgress((progress) =>
                setIngesting(toPhase(progress) !== null),
            ),
        [],
    );

    return ingesting;
}

// Stats refetch a few seconds after the last ingested batch, so the ingest only reads
// quiet that long past its end, or the last heroes would still pop in.
const QUIET_MS = 10_000;

let busyUntil = Infinity;
let watching = false;

/** Starts tracking `ingestQuiet` for the app's lifetime; later calls do nothing. */
export function watchIngestQuiet() {
    if (watching) return;
    watching = true;

    watchIngestProgress((progress) => {
        busyUntil = toPhase(progress) ? Infinity : Date.now() + QUIET_MS;
    });
}

export const ingestQuiet = () => Date.now() >= busyUntil;
