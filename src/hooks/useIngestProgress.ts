import { useEffect, useState } from "react";

import {
    type IngestProgress,
    getIngestProgress,
    onIngestProgress,
} from "@/api/ingest";

export type IngestPhase = {
    kind: "importing" | "updating";
    done: number;
    total: number;
};

/** The running startup backlog, new replays before re-parsed ones, or null when idle. */
export function useIngestProgress(): IngestPhase | null {
    const [progress, setProgress] = useState<IngestProgress | null>(null);

    useEffect(() => {
        let live = false;
        const unlisten = onIngestProgress((next) => {
            live = true;
            setProgress(next);
        });
        // An event can land before the snapshot, which is then already stale.
        getIngestProgress().then((snapshot) => {
            if (!live) setProgress(snapshot);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    if (!progress) return null;
    if (progress.importing.total > 0) {
        return { kind: "importing", ...progress.importing };
    }
    if (progress.updating.total > 0) {
        return { kind: "updating", ...progress.updating };
    }
    return null;
}
