import { useEffect, useEffectEvent } from "react";

/**
 * Focuses `target()` once a panel opens. Waits a frame because the panel stays hidden
 * until it's positioned, and hidden elements can't take focus.
 */
export function useFocusOnOpen(
    open: boolean,
    target: () => HTMLElement | null | undefined,
) {
    const focusTarget = useEffectEvent(() => target()?.focus());

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => focusTarget());
        return () => cancelAnimationFrame(frame);
    }, [open]);
}
