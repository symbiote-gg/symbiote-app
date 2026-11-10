import { useEffect, useRef } from "react";

import { ingestQuiet, watchIngestQuiet } from "./useIngestProgress";

export interface AppearGateOptions {
    resetKey?: unknown;
    duringIngest?: boolean;
}

export function useAppearGate(
    ready: boolean,
    { resetKey, duringIngest = false }: AppearGateOptions = {},
): boolean {
    const settled = useRef(false);
    const key = useRef(resetKey);

    if (!Object.is(key.current, resetKey)) {
        key.current = resetKey;
        settled.current = false;
    }

    useEffect(watchIngestQuiet, []);

    useEffect(() => {
        if (ready) settled.current = true;
    });

    return settled.current && (duringIngest || ingestQuiet());
}
