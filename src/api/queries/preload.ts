import { noop } from "@tanstack/react-query";

const PRELOAD_TIMEOUT_MS = 250;

export const preloadImage = (src: string) => {
    const img = new Image();
    img.src = src;
    return Promise.race([
        img.decode().catch(noop),
        new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
    ]);
};
