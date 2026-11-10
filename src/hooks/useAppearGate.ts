import { useEffect, useRef } from "react";

import type { AppearCheck } from "./useAppear";
import { ingestQuiet, watchIngestQuiet } from "./useIngestProgress";

export interface AppearGateOptions {
    resetKey?: unknown;
    duringIngest?: boolean;
}

const UNSETTLED = Symbol("unsettled");

/**
 * Lets items animate in only once `ready` data has been on screen for `resetKey`, so a
 * first load or a reset doesn't animate everything. Items run the check as they mount,
 * before this hook's effect marks the commit that showed the data as settled.
 */
export function useAppearGate(
    ready: boolean,
    { resetKey, duringIngest = false }: AppearGateOptions = {},
): AppearCheck {
    const settledFor = useRef<unknown>(UNSETTLED);

    useEffect(watchIngestQuiet, []);

    useEffect(() => {
        if (ready) settledFor.current = resetKey;
    });

    return () =>
        Object.is(settledFor.current, resetKey) &&
        (duringIngest || ingestQuiet());
}
