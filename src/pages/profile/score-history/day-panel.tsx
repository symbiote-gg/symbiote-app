import { useFormatter, useTranslations } from "use-intl";

import { Chip, Typography } from "@/ui";
import { usePlayedDate } from "@/utils/dates";
import { GemIcon } from "../score-card/gem";
import { TIERS, rankTone, tierIndex } from "../score-card/tiers";
import type { ScoreDay } from "./days";

import styles from "./styles.module.css";

export interface DayPanelProps {
    day: ScoreDay;
}

export function DayPanel({ day }: DayPanelProps) {
    const t = useTranslations("profile.score");
    const format = useFormatter();
    const playedDate = usePlayedDate();

    const rest = day.games === 0;
    const { rank, tier } = TIERS[tierIndex(day.score)];
    const change = day.previous === null ? 0 : day.score - day.previous;

    return (
        <div className={styles.panel} style={rankTone(rank)}>
            <div className={styles.panelHeader}>
                <Typography size="base" weight="semibold" noWrap>
                    {playedDate(day.day.format("YYYY-MM-DD"))}
                </Typography>
                <Typography as="span" size="sm" variant="tertiary" noWrap>
                    {rest
                        ? t("history.restDay")
                        : t("history.games", { count: day.games })}
                </Typography>
            </div>

            <div className={styles.valueRow}>
                <Typography
                    as="span"
                    size="xl2"
                    weight="semibold"
                    mono
                    className={styles.value}
                >
                    {day.score}
                </Typography>
                {change !== 0 && (
                    <Chip size="sm" tone={change > 0 ? "win" : "loss"}>
                        {format.number(change, { signDisplay: "exceptZero" })}
                    </Chip>
                )}
                <Chip
                    size="sm"
                    tone="rank"
                    leading={<GemIcon className={styles.tierGem} aria-hidden />}
                    className={styles.tierChip}
                >
                    {t(`tier.${tier}`)}
                </Chip>
            </div>
        </div>
    );
}
