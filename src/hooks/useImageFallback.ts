import { useState } from "react";

export function useImageFallback() {
    const [failed, setFailed] = useState(false);

    const onError = () => setFailed(true);

    return [failed, onError] as const;
}
