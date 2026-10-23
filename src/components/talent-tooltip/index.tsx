import { type ReactNode, useMemo } from "react";

import type { TalentPick } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { gameTextBlocks, parseGameText } from "@/utils/game-text";
import { GameText } from "../game-text";
import { Header } from "./header";
import { Step } from "./step";

import styles from "./styles.module.css";

export interface TalentTooltipProps {
    talent: TalentPick;
    level: number;
    children: ReactNode;
}

export function TalentTooltip({ talent, level, children }: TalentTooltipProps) {
    const blocks = useMemo(
        () =>
            talent.description
                ? gameTextBlocks(parseGameText(talent.description))
                : [],
        [talent.description],
    );

    const card = (
        <>
            <Header
                talent={talent}
                level={level}
                quest={blocks.some((block) => block.type === "step")}
            />
            {blocks.length > 0 && (
                <div className={styles.body}>
                    {blocks.map((block, index) =>
                        block.type === "step" ? (
                            <Step key={index} step={block} />
                        ) : (
                            <Typography
                                key={index}
                                size="sm"
                                variant="secondary"
                            >
                                <GameText nodes={block.nodes} />
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
