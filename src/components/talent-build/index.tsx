import type { TalentPick } from "@/api/replays";
import { TIER_LEVELS } from "@/utils/talents";
import { GameIcon } from "../game-icon";
import { TalentTooltip } from "../talent-tooltip";

import styles from "./styles.module.css";

const TIERS = [1, 2, 3, 4, 5, 6, 7];

export interface TalentBuildProps {
    talents: TalentPick[];
    /** How many tiers from the left are turned face up; the rest show a card back. */
    faceUp?: number;
}

/** A slot per tier, holding its pick or left empty. */
export function TalentBuild({
    talents,
    faceUp = TIERS.length,
}: TalentBuildProps) {
    return TIERS.map((tier) => {
        if (tier > faceUp) {
            return <span key={tier} className={styles.back} />;
        }

        const talent = talents.find((pick) => pick.tier === tier);
        if (!talent) {
            return <span key={tier} className={styles.empty} />;
        }

        return (
            <TalentTooltip
                key={tier}
                talent={talent}
                level={TIER_LEVELS[tier - 1]}
            >
                <GameIcon
                    category="abilitytalents"
                    icon={talent.icon}
                    label={talent.name ?? talent.slug}
                    framed
                    className={styles.talent}
                />
            </TalentTooltip>
        );
    });
}
