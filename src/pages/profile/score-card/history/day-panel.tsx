import { useFormatter, useTranslations } from "use-intl";

import { Chip, Eyebrow, Typography } from "@/ui";
import { usePlayedDate } from "@/utils/dates";
import { TIERS, rankTone, tierIndex } from "../tiers";
import type { ScoreDay } from "./days";

import styles from "./styles.module.css";

export interface DayPanelProps {
    day: ScoreDay;
}

export function DayPanel({ day }: DayPanelProps) {
    const t = useTranslations("profile.score.history");
    const format = useFormatter();
    const playedDate = usePlayedDate();

    const rest = day.games === 0;
    const { rank } = TIERS[tierIndex(day.score)];
    const change = day.previous === null ? null : day.score - day.previous;

    return (
        <>
            <div className={styles.panelHeader}>
                <Typography size="base" weight="semibold" noWrap>
                    {playedDate(day.day.format("YYYY-MM-DD"))}
                </Typography>
                <Chip
                    size="sm"
                    tone={rest ? "neutral" : "primary"}
                    uppercase
                    className={styles.panelChip}
                >
                    {rest ? t("restDay") : t("games", { count: day.games })}
                </Chip>
            </div>
            <div className={styles.cells}>
                <div className={styles.cell} style={rankTone(rank)}>
                    <Eyebrow as="span" noWrap>
                        {t("score")}
                    </Eyebrow>
                    <Typography
                        as="span"
                        size="lg"
                        weight="semibold"
                        mono
                        className={styles.score}
                    >
                        {day.score}
                    </Typography>
                </div>
                <div className={styles.cell}>
                    <Eyebrow as="span" noWrap>
                        {t("change")}
                    </Eyebrow>
                    <Typography as="span" size="lg" weight="semibold" mono>
                        {change === null
                            ? "-"
                            : format.number(change, {
                                  signDisplay: "exceptZero",
                              })}
                    </Typography>
                </div>
            </div>
        </>
    );
}
