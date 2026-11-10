import type { GameTextNode, GameTextStep } from "@/utils/game-text";

export const TIER_LEVELS = [1, 4, 7, 10, 13, 16, 20];

export type TalentTextGroup =
    | { type: "paragraph"; nodes: GameTextNode[] }
    | { type: "steps"; steps: GameTextStep[] };

export const isQuest = (groups: TalentTextGroup[]) =>
    groups.some((group) => group.type === "steps");
