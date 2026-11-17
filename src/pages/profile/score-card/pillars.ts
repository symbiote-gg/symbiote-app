import type { RoleStat } from "@/api/replays";
import type { ScorePillarId } from "@/api/stats";

// Mirrors `PILLARS` in src-tauri/src/profile_score.rs: keep the two in sync.
// Capped at three stats a pillar, as only the empty state reads it.
export const PILLAR_STATS: Record<ScorePillarId, RoleStat[]> = {
    fighting: ["heroDamage", "killParticipation", "hardCc"],
    survival: ["deathShare", "timeDeadShare"],
    // Three rows, each the main stat of some roles: protection is left out.
    teamRole: [
        "healing",
        "teamfightDamageTakenShare",
        "teamfightHeroDamageShare",
    ],
    map: ["xp", "siegeDamage", "mercCaptures"],
};

export const PILLAR_IDS = Object.keys(PILLAR_STATS) as ScorePillarId[];
