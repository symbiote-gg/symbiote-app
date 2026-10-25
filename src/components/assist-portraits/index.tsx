import { useTranslations } from "use-intl";

import { Tooltip } from "@/ui";
import { type Roster, heroName } from "@/utils/timeline/roster";
import { TeamPortrait } from "../team-portrait";

import styles from "./styles.module.css";

interface AssistPortraitsProps {
    slots: number[];
    roster: Roster;
}

export function AssistPortraits({ slots, roster }: AssistPortraitsProps) {
    const t = useTranslations("replay.timeline");

    return (
        <Tooltip
            content={t("assists", {
                heroes: slots.map((slot) => heroName(roster, slot)).join(", "),
            })}
        >
            <span className={styles.stack}>
                {slots.map((slot) => (
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
    );
}
