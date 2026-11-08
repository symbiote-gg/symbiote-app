import type { TalentRecord } from "@/api/heroes";
import { isJudged, winRate } from "@/utils/hero-stats";
import { TIER_LEVELS } from "@/utils/talents";

/** Picked, but too rarely for a whole percent. */
const TRACE_PICK = 0.005;

export interface TierTalent {
    talent: TalentRecord;
    level: number;
    pickRate: number;
    rate: number | null;
    top: boolean;
}

export interface Tier {
    level: number;
    talents: TierTalent[];
}

export function buildTiers(talents: TalentRecord[]): Tier[] {
    return TIER_LEVELS.map((level, index) => {
        const tierTalents = talents.filter(
            (talent) => talent.tier === index + 1,
        );
        const picks = tierTalents.reduce(
            (sum, talent) => sum + talent.picks,
            0,
        );
        const mostPicks = Math.max(
            0,
            ...tierTalents.map((talent) => talent.picks),
        );
        const top = tierTalents.find(
            (talent) => talent.picks > 0 && talent.picks === mostPicks,
        );

        const entries = tierTalents.map((talent) => ({
            talent,
            level,
            pickRate: picks === 0 ? 0 : talent.picks / picks,
            rate: isJudged(talent.wins, talent.losses)
                ? winRate(talent.wins, talent.losses)
                : null,
            top: talent === top,
        }));

        return { level, talents: entries };
    }).filter((tier) => tier.talents.length > 0);
}

export const formatPickRate = (
    { talent, pickRate }: TierTalent,
    percent: (value: number) => string,
) =>
    talent.picks > 0 && pickRate < TRACE_PICK
        ? `<${percent(0.01)}`
        : percent(pickRate);
