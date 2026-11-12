import { useEffect, useRef } from "react";

// Long enough that a pointer sweeping across a list prefetches nothing.
const HOVER_INTENT_MS = 100;

export function useHoverPrefetch(prefetch: () => void) {
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const onPointerEnter = () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(prefetch, HOVER_INTENT_MS);
    };

    const onPointerLeave = () => clearTimeout(timer.current);

    return { onPointerEnter, onPointerLeave };
}
