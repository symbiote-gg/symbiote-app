import { useEffect, useRef } from "react";

/**
 * Closes an open panel anchored to `anchor` on Escape, which also moves focus back to
 * the anchor, or on a pointer down outside both. `Popover` stops pointer downs inside
 * it from reaching the document, so they don't count as outside.
 */
export function useDismiss(
    open: boolean,
    anchor: HTMLElement | null,
    onClose: () => void,
) {
    const close = useRef(onClose);
    close.current = onClose;

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            if (!anchor?.contains(e.target as Node)) close.current();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            close.current();
            anchor?.focus();
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, anchor]);
}
