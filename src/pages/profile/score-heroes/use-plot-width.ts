import { useLayoutEffect, useRef, useState } from "react";

/** The plot's width in pixels, which the dots are placed against. */
export function usePlotWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;

        const onResize = () => setWidth(element.clientWidth);

        onResize();

        const observer = new ResizeObserver(onResize);
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return { ref, width };
}
