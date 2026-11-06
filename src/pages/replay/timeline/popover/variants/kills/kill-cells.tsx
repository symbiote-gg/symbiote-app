import { Sword } from "lucide-react";

import { AiPortrait, AssistPortraits, TeamPortrait } from "@/components";
import { Tooltip } from "@/ui";
import { Roster } from "@/utils/timeline/roster";

import styles from "./styles.module.css";

interface KillCellsProps {
    killingBlow: number | null;
    credited: number[];
    noKiller: string;
    roster: Roster;
}

export function KillCells({
    killingBlow,
    credited,
    noKiller,
    roster,
}: KillCellsProps) {
    const assists = credited.filter((slot) => slot !== killingBlow);

    return (
        <>
            <span className={styles.killer}>
                {killingBlow !== null ? (
                    <TeamPortrait
                        slot={killingBlow}
                        size="sm"
                        roster={roster}
                    />
                ) : (
                    <Tooltip content={noKiller}>
                        <AiPortrait
                            label={noKiller}
                            className={styles.noKiller}
                        />
                    </Tooltip>
                )}
                {assists.length > 0 && (
                    <AssistPortraits slots={assists} roster={roster} />
                )}
            </span>
            <Sword className={styles.sword} aria-hidden />
        </>
    );
}
