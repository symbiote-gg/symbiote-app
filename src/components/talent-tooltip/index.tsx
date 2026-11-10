import type { ReactNode } from "react";

import type { TalentPick } from "@/api/replays";
import { useTalentGroups } from "@/hooks/useTalentGroups";
import { Tooltip } from "@/ui";
import { isQuest } from "@/utils/talents";
import { TalentDescription } from "../talent-description";
import { Header } from "./header";

import styles from "./styles.module.css";

export type TooltipTalent = Pick<
    TalentPick,
    "slug" | "name" | "description" | "icon"
>;

export interface TalentTooltipProps {
    talent: TooltipTalent;
    level: number;
    children: ReactNode;
}

export function TalentTooltip({ talent, level, children }: TalentTooltipProps) {
    const groups = useTalentGroups(talent.description);

    const card = (
        <>
            <Header talent={talent} level={level} quest={isQuest(groups)} />
            <TalentDescription groups={groups} />
        </>
    );

    return (
        <Tooltip content={card} compact={false} panelClassName={styles.panel}>
            {children}
        </Tooltip>
    );
}
