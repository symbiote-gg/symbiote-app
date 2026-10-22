import { CpuAi, Sword } from "lucide-react";
import { useTranslations } from "use-intl";

import { Tooltip } from "@/ui";
import { Roster, heroName } from "@/utils/timeline/roster";
import { TeamPortrait } from "../../parts/team-portrait";

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
    const t = useTranslations("replay.timeline");

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
                        <span className={styles.noKiller} aria-label={noKiller}>
                            <CpuAi className={styles.tileIcon} aria-hidden />
                        </span>
                    </Tooltip>
                )}
                {assists.length > 0 && (
                    <Tooltip
                        content={t("assists", {
                            heroes: assists
                                .map((slot) => heroName(roster, slot))
                                .join(", "),
                        })}
                    >
                        <span className={styles.assists}>
                            {assists.map((slot) => (
                                <TeamPortrait
                                    key={slot}
                                    slot={slot}
                                    size="xs"
                                    roster={roster}
                                    thin
                                />
                            ))}
                        </span>
                    </Tooltip>
                )}
            </span>
            <Sword className={styles.sword} aria-hidden />
        </>
    );
}
