import { Gamepad2, Users } from "lucide-react";
import { useTranslations } from "use-intl";

import { Skeleton, StatTile, Typography } from "@/ui";
import { HeroTiersSkeleton } from "./heroes/skeleton";
import { HistorySkeleton } from "./history/skeleton";
import { Ladder } from "./ladder";
import { PartsSkeleton } from "./parts/skeleton";
import { RingSkeleton } from "./ring";
import { SpreadLegend } from "./spread";
import { SpreadSkeleton } from "./spread/skeleton";

import styles from "./styles.module.css";

export function BodySkeleton() {
    const t = useTranslations("profile.score");

    return (
        <div className={styles.body}>
            <Ladder score={null} loading />
            <div className={styles.overview}>
                <div className={styles.side}>
                    <StatTile
                        variant="panel"
                        icon={Gamepad2}
                        label={t("careerGames")}
                        value={<Skeleton />}
                        detail={t("careerDetail")}
                        meta={t("spread.yours")}
                        footer={<SpreadLegend tone="single" />}
                        aside={<SpreadSkeleton />}
                        className={styles.fact}
                    />
                    <PartsSkeleton ids={["fighting", "survival"]} />
                </div>
                <div className={styles.rating}>
                    <RingSkeleton />
                    <Typography size="sm">
                        <Skeleton className={styles.progressBar} />
                    </Typography>
                </div>
                <div className={styles.side}>
                    <StatTile
                        variant="panel"
                        icon={Users}
                        label={t("pool.label")}
                        value={<Skeleton />}
                        detail={t("pool.detail")}
                        meta={t("spread.theirs")}
                        footer={<SpreadLegend tone="split" />}
                        aside={<SpreadSkeleton />}
                        className={styles.fact}
                    />
                    <PartsSkeleton ids={["teamRole", "map"]} />
                </div>
            </div>
            <HistorySkeleton />
            <HeroTiersSkeleton />
        </div>
    );
}
