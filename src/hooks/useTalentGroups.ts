import { useMemo } from "react";

import { gameTextBlocks, parseGameText } from "@/utils/game-text";
import type { TalentTextGroup } from "@/utils/talents";

/** Splits a talent description into paragraphs and runs of quest steps. */
export function useTalentGroups(description: string | null) {
    return useMemo(() => {
        if (!description) return [];

        const groups: TalentTextGroup[] = [];
        for (const block of gameTextBlocks(parseGameText(description))) {
            const previous = groups[groups.length - 1];
            if (block.type === "paragraph") groups.push(block);
            else if (previous?.type === "steps") previous.steps.push(block);
            else groups.push({ type: "steps", steps: [block] });
        }

        return groups;
    }, [description]);
}
