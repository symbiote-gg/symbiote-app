import { useState } from "react";

import { FILTERS, type Filter, STORAGE_KEY } from "@/utils/timeline/filters";

function readHidden(): Set<Filter> {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return new Set(
            Array.isArray(stored)
                ? FILTERS.filter((filter) => stored.includes(filter))
                : [],
        );
    } catch {
        return new Set();
    }
}

function writeHidden(hidden: Set<Filter>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
}

export function useHiddenFilters() {
    const [hidden, setHidden] = useState(readHidden);

    const toggle = (filter: Filter) => {
        const next = new Set(hidden);
        if (next.has(filter)) next.delete(filter);
        else next.add(filter);
        writeHidden(next);
        setHidden(next);
    };

    return [hidden, toggle] as const;
}
