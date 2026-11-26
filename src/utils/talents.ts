import type { TalentPick } from "@/api/replays";
import type { GameTextNode, GameTextStep } from "@/utils/game-text";

export const TIER_LEVELS = [1, 4, 7, 10, 13, 16, 20];

const BUILD_HERO_OVERRIDES: Record<string, string> = {
    "Deckard Cain": "Deckard",
    "The Lost Vikings": "LostVikings",
};

// Builds name the hero by its English name without apostrophes, dots and spaces.
const buildHero = (heroName: string) =>
    BUILD_HERO_OVERRIDES[heroName] ?? heroName.replace(/['. ]/g, "");

// The string the game's talent pane imports: one digit per tier holding the pick's
// position in it, 0 for a tier left unpicked.
export const buildCode = (heroName: string, talents: TalentPick[]) => {
    if (talents.length === 0 || talents.some((pick) => pick.sort === null))
        return null;

    const digits = TIER_LEVELS.map((_, index) => {
        const pick = talents.find((talent) => talent.tier === index + 1);

        return pick?.sort ?? 0;
    });

    return `[T${digits.join("")},${buildHero(heroName)}]`;
};

export type TalentTextGroup =
    | { type: "paragraph"; nodes: GameTextNode[] }
    | { type: "steps"; steps: GameTextStep[] };

export const isQuest = (groups: TalentTextGroup[]) =>
    groups.some((group) => group.type === "steps");
