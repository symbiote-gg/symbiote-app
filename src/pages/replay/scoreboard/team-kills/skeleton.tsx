import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Eyebrow, Skeleton, Typography, sideClasses } from "@/ui";

import styles from "./styles.module.css";

interface TeamLabelSkeletonProps {
    side: "ally" | "enemy";
}

function TeamLabelSkeleton({ side }: TeamLabelSkeletonProps) {
    const t = useTranslations("replay");

    return (
        <div
            className={classNames(
                styles.label,
                styles[side],
                sideClasses(side),
            )}
        >
            <div className={styles.heading}>
                <Typography
                    size="lg"
                    weight="semibold"
                    display
                    uppercase
                    noWrap
                    className={styles.team}
                >
                    {t("team", { side })}
                </Typography>
            </div>
            <Typography size="xs" noWrap>
                <Skeleton className={styles.breakdownBar} />
            </Typography>
        </div>
    );
}

export function TeamKillsSkeleton() {
    const t = useTranslations("replay");

    return (
        <div className={styles.root}>
            <TeamLabelSkeleton side="ally" />
            <Typography weight="semibold" display className={styles.count}>
                <Skeleton className={styles.countBar} />
            </Typography>
            <div className={styles.center}>
                <Eyebrow noWrap className={styles.title}>
                    {t("teamKills.title")}
                </Eyebrow>
                <Typography size="xs" noWrap>
                    <Skeleton className={styles.durationBar} />
                </Typography>
            </div>
            <Typography weight="semibold" display className={styles.count}>
                <Skeleton className={styles.countBar} />
            </Typography>
            <TeamLabelSkeleton side="enemy" />
        </div>
    );
}
