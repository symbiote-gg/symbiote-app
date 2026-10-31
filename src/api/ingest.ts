import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type IngestCounter = {
    done: number;
    total: number;
};

export type IngestProgress = {
    importing: IngestCounter;
    updating: IngestCounter;
};

export const getIngestProgress = () =>
    invoke<IngestProgress>("get_ingest_progress");

export const onIngestProgress = (handler: (progress: IngestProgress) => void) =>
    listen<IngestProgress>("ingest-progress", (event) =>
        handler(event.payload),
    );

export const watchIngestProgress = (
    handler: (progress: IngestProgress) => void,
) => {
    let live = false;
    const unlisten = onIngestProgress((next) => {
        live = true;
        handler(next);
    });

    getIngestProgress().then((snapshot) => {
        if (!live) handler(snapshot);
    });

    return () => {
        unlisten.then((fn) => fn());
    };
};
