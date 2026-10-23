import { type ReactNode, useMemo } from "react";

import type { TalentPick } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import {
    type GameTextNode,
    type GameTextStep,
    gameTextBlocks,
    parseGameText,
} from "@/utils/game-text";
import { GameText } from "../game-text";
import { Header } from "./header";
import { Steps } from "./steps";

import styles from "./styles.module.css";

type Group =
    | { type: "paragraph"; nodes: GameTextNode[] }
    | { type: "steps"; steps: GameTextStep[] };

export interface TalentTooltipProps {
    talent: TalentPick;
    level: number;
    children: ReactNode;
}

export function TalentTooltip({ talent, level, children }: TalentTooltipProps) {
    const groups = useMemo(() => {
        if (!talent.description) return [];

        const groups: Group[] = [];
        for (const block of gameTextBlocks(parseGameText(talent.description))) {
            const previous = groups[groups.length - 1];
            if (block.type === "paragraph") groups.push(block);
            else if (previous?.type === "steps") previous.steps.push(block);
            else groups.push({ type: "steps", steps: [block] });
        }

        return groups;
    }, [talent.description]);

    const card = (
        <>
            <Header
                talent={talent}
                level={level}
                quest={groups.some((group) => group.type === "steps")}
            />
            {groups.length > 0 && (
                <div className={styles.body}>
                    {groups.map((group, index) =>
                        group.type === "steps" ? (
                            <Steps key={index} steps={group.steps} />
                        ) : (
                            <Typography
                                key={index}
                                size="sm"
                                variant="secondary"
                            >
                                <GameText nodes={group.nodes} />
                            </Typography>
                        ),
                    )}
                </div>
            )}
        </>
    );

    return (
        <Tooltip content={card} compact={false} panelClassName={styles.panel}>
            {children}
        </Tooltip>
    );
}
