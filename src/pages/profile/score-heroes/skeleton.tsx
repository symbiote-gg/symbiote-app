import { ChartScatter } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardHeader, Skeleton } from "@/ui";
import { MIN_HEIGHT } from "./swarm";
import { TierBars } from "./tier-bars";

import styles from "./styles.module.css";

export function HeroesSkeleton() {
    const t = useTranslations("profile.score.heroes");

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartScatter}
                title={t("title")}
                subtitle={<Skeleton className={styles.subtitleBar} />}
            />
            <div className={styles.body}>
                <div className={styles.plot} style={{ height: MIN_HEIGHT }}>
                    <Skeleton className={styles.plotBar} />
                </div>
                <TierBars />
            </div>
        </Card>
    );
}
