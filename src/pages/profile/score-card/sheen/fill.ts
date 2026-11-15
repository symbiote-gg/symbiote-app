import type { CSSProperties } from "react";

export const sheenFill = (id: string) =>
    ({ "--sheen": `url("#${id}")` }) as CSSProperties;
