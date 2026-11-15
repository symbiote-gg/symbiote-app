import type { CSSProperties } from "react";

import type { ScorePillarId } from "@/api/stats";

const PILLAR_COLORS: Record<ScorePillarId, string> = {
    fighting: "var(--color-part-fighting)",
    survival: "var(--color-part-survival)",
    teamRole: "var(--color-part-team-role)",
    map: "var(--color-part-map)",
};

/** The colour a part keeps in its row. */
export const pillarTone = (id: ScorePillarId) =>
    ({
        "--tone": PILLAR_COLORS[id],
        "--accent": PILLAR_COLORS[id],
    }) as CSSProperties;
