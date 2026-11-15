import { History as HistoryIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { Skeleton, StatTile, Typography } from "@/ui";
import { GemIcon } from "../gem";

import styles from "./styles.module.css";

// The backend's recent window, which a rated player has almost always filled.
const RECENT_GAMES = 50;

export function HistorySkeleton() {
    const t = useTranslations("profile.score");

    const tiles = [
        { label: t("recent", { count: RECENT_GAMES }), icon: HistoryIcon },
        { label: t("history.best"), icon: GemIcon },
        { label: t("history.lowest"), icon: GemIcon },
    ];

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div className={styles.heading}>
                    <Typography size="lg" weight="semibold">
                        {t("history.title")}
                    </Typography>
                    <Typography size="sm" variant="tertiary">
                        {t("history.subtitle")}
                    </Typography>
                </div>
            </div>
            <div className={styles.tiles}>
                {tiles.map(({ label, icon }) => (
                    <StatTile
                        key={label}
                        variant="panel"
                        icon={icon}
                        label={label}
                        value={<Skeleton className={styles.tileBar} />}
                    />
                ))}
            </div>
            <div className={styles.chart}>
                <div className={styles.ticks} />
                <div className={styles.plot}>
                    <Skeleton className={styles.plotBar} />
                </div>
            </div>
        </div>
    );
}
