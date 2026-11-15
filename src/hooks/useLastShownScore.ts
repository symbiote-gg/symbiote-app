import type { ScoreScope } from "@/api/stats";

const STORAGE_KEY = "profile-score-shown";

function read(): Partial<Record<ScoreScope, number>> {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
    } catch {
        return {};
    }
}

/**
 * The score last shown for the scope on this device, `null` when none was, so a
 * new one can move in from it, and a setter to call once a score has been shown.
 */
export function useLastShownScore(scope: ScoreScope | undefined) {
    const stored = scope ? read()[scope] : undefined;
    const from = typeof stored === "number" ? stored : null;

    const onShown = (score: number) => {
        if (!scope) return;

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...read(), [scope]: score }),
        );
    };

    return [from, onShown] as const;
}
