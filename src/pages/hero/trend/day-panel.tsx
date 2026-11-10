import { useTranslations } from "use-intl";

import { Chip, Eyebrow, Typography, WinRate } from "@/ui";
import { usePlayedDate } from "@/utils/dates";
import type { Day } from "./days";

import styles from "./styles.module.css";

export interface DayPanelProps {
    day: Day;
}

export function DayPanel({ day }: DayPanelProps) {
    const t = useTranslations("hero.trend");
    const playedDate = usePlayedDate();

    const rest = day.games === 0;

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
                <div className={styles.cell}>
                    <Eyebrow as="span">{t("thisDay")}</Eyebrow>
                    <Typography
                        as="span"
                        size="lg"
                        weight="semibold"
                        mono
                        className={styles.record}
                    >
                        <span
                            className={day.wins > 0 ? styles.wins : styles.none}
                        >
                            {day.wins}
                            <span className={styles.letter}>
                                {t("winLetter")}
                            </span>
                        </span>
                        <span
                            className={
                                day.losses > 0 ? styles.losses : styles.none
                            }
                        >
                            {day.losses}
                            <span className={styles.letter}>
                                {t("lossLetter")}
                            </span>
                        </span>
                    </Typography>
                </div>
                <div className={styles.cell}>
                    <Eyebrow as="span">{t("careerLabel")}</Eyebrow>
                    <Typography as="span" size="lg" weight="semibold" mono>
                        <WinRate rate={day.carried} rolling={false} />
                    </Typography>
                </div>
            </div>
        </>
    );
}
