import { useEffect, useRef } from "react";

/**
 * Focuses `target()` once a panel opens. Waits a frame because the panel stays hidden
 * until it's positioned, and hidden elements can't take focus.
 */
export function useFocusOnOpen(
    open: boolean,
    target: () => HTMLElement | null | undefined,
) {
    const getTarget = useRef(target);
    getTarget.current = target;

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => getTarget.current()?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open]);
}
