import { useTranslations } from "use-intl";

import { AiPortrait, HeroPlayerName, TeamPortrait } from "@/components";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Eyebrow, Typography } from "@/ui";
import { killerOf } from "@/utils/timeline/markers";
import type { Roster } from "@/utils/timeline/roster";
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
                        <HeroPlayerName slot={killer} roster={roster} />
                    </div>
                ) : (
                    <div className={styles.killer}>
                        <AiPortrait />
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
                                <HeroPlayerName
                                    slot={slot}
                                    roster={roster}
                                    inline
                                />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
