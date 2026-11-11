import { ChartSpline } from "lucide-react";
import { useTranslations } from "use-intl";

import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Skeleton, Typography } from "@/ui";

import styles from "./styles.module.css";

export function TrendSkeleton() {
    const t = useTranslations("hero.trend");
    const { percent } = useFormatStat();

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartSpline}
                title={t("title")}
                subtitle={<Skeleton className={styles.subtitleBar} />}
            />
            <div className={styles.body}>
                <div className={styles.ticks}>
                    <Typography
                        as="span"
                        size="xs"
                        mono
                        aria-hidden
                        className={styles.tickSizer}
                    >
                        {percent(1)}
                    </Typography>
                </div>
                <div className={styles.rate}>
                    <Skeleton className={styles.rateBar} />
                </div>
                <div className={styles.games} />
                <div className={styles.labels}>
                    <Typography as="span" size="xs" mono noWrap>
                        <Skeleton />
                    </Typography>
                </div>
            </div>
        </Card>
    );
}
