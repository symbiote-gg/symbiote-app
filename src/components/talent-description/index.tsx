import classNames from "classnames";
import { useMemo } from "react";

import { Typography } from "@/ui";
import {
    type GameTextNode,
    type GameTextStep,
    gameTextBlocks,
    parseGameText,
} from "@/utils/game-text";
import { GameText } from "../game-text";
import { Steps } from "./steps";

import styles from "./styles.module.css";

export type TalentTextGroup =
    | { type: "paragraph"; nodes: GameTextNode[] }
    | { type: "steps"; steps: GameTextStep[] };

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

export const isQuest = (groups: TalentTextGroup[]) =>
    groups.some((group) => group.type === "steps");

export interface TalentDescriptionProps {
    groups: TalentTextGroup[];
    className?: string;
}

export function TalentDescription({
    groups,
    className,
}: TalentDescriptionProps) {
    if (groups.length === 0) return null;

    return (
        <div className={classNames(className, styles.root)}>
            {groups.map((group, index) =>
                group.type === "steps" ? (
                    <Steps key={index} steps={group.steps} />
                ) : (
                    <Typography key={index} size="sm" variant="secondary">
                        <GameText nodes={group.nodes} />
                    </Typography>
                ),
            )}
        </div>
    );
}
