import { History as HistoryIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import {
    Card,
    CardHeader,
    ChipButton,
    ChipDivider,
    ChipGroup,
    Skeleton,
    Stat,
} from "@/ui";
import { RECENT, type Range } from "./days";

import styles from "./styles.module.css";

// The backend's recent window, which a rated player has almost always filled.
const RECENT_GAMES = 50;

const onRangeClick = () => {};

export function HistorySkeleton() {
    const t = useTranslations("profile.score");

    const labels = [
        t("recent", { count: RECENT_GAMES }),
        t("history.best"),
        t("history.lowest"),
    ];

    const chip = (value: Range) => (
        <ChipButton
            key={value}
            pressed={value === "all"}
            disabled
            onClick={onRangeClick}
        >
            {t(`history.range.${value}`)}
        </ChipButton>
    );

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={HistoryIcon}
                title={t("history.title")}
                subtitle={t("history.subtitle")}
                action={
                    <div className={styles.actions}>
                        <dl className={styles.stats}>
                            {labels.map((label) => (
                                <Stat key={label} label={label}>
                                    <Skeleton className={styles.statBar} />
                                </Stat>
                            ))}
                        </dl>
                        <ChipGroup label={t("history.range.label")}>
                            {RECENT.map(chip)}
                            <ChipDivider />
                            {chip("all")}
                        </ChipGroup>
                    </div>
                }
            />
            <div className={styles.body}>
                <div className={styles.chart}>
                    <div className={styles.ticks} />
                    <div className={styles.plot}>
                        <Skeleton className={styles.plotBar} />
                    </div>
                </div>
            </div>
        </Card>
    );
}
