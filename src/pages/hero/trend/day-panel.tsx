import { useFormatter, useTranslations } from "use-intl";

import { Chip, Typography, WinRate } from "@/ui";
import { usePlayedDate } from "@/utils/dates";
import type { Day } from "./days";

import styles from "./styles.module.css";

export interface DayPanelProps {
    day: Day;
}

export function DayPanel({ day }: DayPanelProps) {
    const t = useTranslations("hero.trend");
    const format = useFormatter();
    const playedDate = usePlayedDate();

    const rest = day.games === 0;

    const change =
        day.carried === null || day.previous === null
            ? 0
            : Math.round((day.carried - day.previous) * 1000) / 1000;

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <Typography size="base" weight="semibold" noWrap>
                    {playedDate(day.day.format("YYYY-MM-DD"))}
                </Typography>
                <Typography as="span" size="sm" variant="tertiary" noWrap>
                    {rest ? t("restDay") : t("games", { count: day.games })}
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
                    <WinRate rate={day.carried} rolling={false} />
                </Typography>
                {change !== 0 && (
                    <Chip size="sm" tone={change > 0 ? "win" : "loss"}>
                        {format.number(change, {
                            style: "percent",
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                            signDisplay: "exceptZero",
                        })}
                    </Chip>
                )}
            </div>

            <Typography
                as="span"
                weight="semibold"
                mono
                className={styles.record}
            >
                <span className={day.wins > 0 ? styles.wins : styles.none}>
                    {day.wins}
                    <span className={styles.letter}>{t("winLetter")}</span>
                </span>
                <span className={day.losses > 0 ? styles.losses : styles.none}>
                    {day.losses}
                    <span className={styles.letter}>{t("lossLetter")}</span>
                </span>
            </Typography>
        </div>
    );
}
