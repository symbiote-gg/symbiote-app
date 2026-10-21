import { useState } from "react";

import { ME_STORAGE_KEY } from "@/utils/timeline/filters";

function readMe() {
    return localStorage.getItem(ME_STORAGE_KEY) === "true";
}

export function useMeFilter() {
    const [me, setMe] = useState(readMe);

    const toggle = () => {
        localStorage.setItem(ME_STORAGE_KEY, String(!me));
        setMe(!me);
    };

    return [me, toggle] as const;
}
