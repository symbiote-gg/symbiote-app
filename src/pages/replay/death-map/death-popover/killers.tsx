import { CpuAi } from "lucide-react";
import { useTranslations } from "use-intl";

import { TeamPortrait } from "@/components";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Eyebrow, Typography } from "@/ui";
import { killerOf } from "@/utils/timeline/markers";
import { type Roster, heroName, playerOf } from "@/utils/timeline/roster";
import type { DeathEntry } from "@/utils/timeline/types";

import styles from "./styles.module.css";

interface KillersProps {
    death: DeathEntry;
    roster: Roster;
    text: TimelineText;
}

export function Killers({ death, roster, text }: KillersProps) {
    const t = useTranslations("replay");

    const killer = killerOf(death);
    const assists = death.killers.filter((slot) => slot !== killer);

    return (
        <div className={styles.killers}>
            <div className={styles.group}>
                <div className={styles.head}>
                    <Typography as="span" size="xs" variant="tertiary" mono>
                        {text.at(death.time)}
                    </Typography>
                    <Eyebrow as="span">{t("killLog.killedBy")}</Eyebrow>
                </div>

                {killer !== null ? (
                    <div className={styles.killer}>
                        <TeamPortrait slot={killer} size="sm" roster={roster} />
                        <span className={styles.killerText}>
                            <Typography as="span" weight="semibold" truncate>
                                {heroName(roster, killer)}
                            </Typography>
                            <Typography
                                as="span"
                                size="sm"
                                variant="tertiary"
                                truncate
                            >
                                {playerOf(roster, killer)?.name}
                            </Typography>
                        </span>
                    </div>
                ) : (
                    <div className={styles.killer}>
                        <span className={styles.ai}>
                            <CpuAi className={styles.aiIcon} aria-hidden />
                        </span>
                        <Typography as="span" weight="semibold">
                            {t("timeline.aiCredit")}
                        </Typography>
                    </div>
                )}
            </div>

            {assists.length > 0 && (
                <div className={styles.group}>
                    <Eyebrow as="span">{t("deathMap.assists")}</Eyebrow>
                    <ul className={styles.assists}>
                        {assists.map((slot) => (
                            <li key={slot} className={styles.assist}>
                                <TeamPortrait
                                    slot={slot}
                                    size="xs"
                                    roster={roster}
                                />
                                <span className={styles.assistText}>
                                    <Typography
                                        as="span"
                                        size="sm"
                                        weight="semibold"
                                        noWrap
                                    >
                                        {heroName(roster, slot)}
                                    </Typography>
                                    <Typography
                                        as="span"
                                        size="sm"
                                        variant="tertiary"
                                        truncate
                                    >
                                        {playerOf(roster, slot)?.name}
                                    </Typography>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
