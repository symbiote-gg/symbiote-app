import classNames from "classnames";

import { Typography } from "@/ui";
import type { TalentTextGroup } from "@/utils/talents";
import { GameText } from "../game-text";
import { Steps } from "./steps";

import styles from "./styles.module.css";

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
