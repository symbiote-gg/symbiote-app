import { useTranslations } from "use-intl";

import { Eyebrow, Skeleton, Stat, Typography } from "@/ui";

import styles from "./styles.module.css";

const STATS = ["games", "avgGame", "kda", "mvps"] as const;

export function TimePanelSkeleton() {
    const t = useTranslations("hero.career");

    return (
        <div className={styles.root}>
            <Eyebrow className={styles.title}>{t("timePlayed")}</Eyebrow>
            <Typography display noWrap className={styles.total}>
                <Skeleton className={styles.totalBar} />
            </Typography>
            <dl className={styles.stats}>
                {STATS.map((key) => (
                    <Stat key={key} label={t(key)}>
                        <Skeleton className={styles.statBar} />
                    </Stat>
                ))}
            </dl>
            <div className={styles.life}>
                <Skeleton className={styles.meterBar} />
                <div className={styles.lifeLabels}>
                    <Typography size="xs" noWrap>
                        <Skeleton className={styles.lifeBar} />
                    </Typography>
                    <Typography size="xs" noWrap>
                        <Skeleton className={styles.lifeBar} />
                    </Typography>
                </div>
            </div>
        </div>
    );
}
