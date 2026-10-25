import { useTranslations } from "use-intl";

import { Chip, type ChipTone, Eyebrow, Typography } from "@/ui";
import { type Roster, heroName } from "@/utils/timeline/roster";
import type { TopSlot } from "./kill-log";

import styles from "./styles.module.css";

interface TopProps {
    label: string;
    tone: ChipTone;
    top: TopSlot | null;
    roster: Roster;
}

export function Top({ label, tone, top, roster }: TopProps) {
    const t = useTranslations("replay.killLog");

    if (!top) return null;

    return (
        <div className={styles.top}>
            <Eyebrow>{label}</Eyebrow>
            <Typography weight="semibold" truncate>
                {heroName(roster, top.slot)}
            </Typography>
            <Chip size="sm" tone={tone} className={styles.topCount}>
                {t("topCount", { count: top.count })}
            </Chip>
        </div>
    );
}
