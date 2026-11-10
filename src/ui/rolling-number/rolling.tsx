import { Children, type ReactNode } from "react";

import { RollingNumber } from ".";

export function rolling(node: ReactNode) {
    if (typeof node === "number" || typeof node === "string") {
        return <RollingNumber value={String(node)} />;
    }
    return node;
}

export function rollingChunks(chunks: ReactNode) {
    return <RollingNumber value={Children.toArray(chunks).join("")} />;
}
