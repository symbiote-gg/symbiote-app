import { Crown, type LucideIcon, Rewind } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, Eyebrow, Skeleton, Stat, Typography } from "@/ui";

import styles from "./styles.module.css";

interface GameCardSkeletonProps {
    icon: LucideIcon;
    title: string;
}

function GameCardSkeleton({ icon: Icon, title }: GameCardSkeletonProps) {
    const t = useTranslations("hero.games");

    return (
        <div className={styles.placeholder}>
            <Card className={styles.root}>
                <div className={styles.top}>
                    <Eyebrow className={styles.eyebrow}>
                        <Icon aria-hidden />
                        {title}
                    </Eyebrow>
                    <Skeleton className={styles.chipBar} />
                </div>
                <div className={styles.bottom}>
                    <div className={styles.body}>
                        <Typography as="p" display className={styles.headline}>
                            <Skeleton className={styles.headlineBar} />
                        </Typography>
                        <Typography size="sm">
                            <Skeleton className={styles.metaBar} />
                        </Typography>
                    </div>
                    <dl className={styles.stats}>
                        <Stat label={t("kad")}>
                            <Skeleton className={styles.kadBar} />
                        </Stat>
                    </dl>
                </div>
            </Card>
        </div>
    );
}

export function GamesSkeleton() {
    const t = useTranslations("hero.games");

    return (
        <div className={styles.games}>
            <GameCardSkeleton icon={Crown} title={t("bestGame")} />
            <GameCardSkeleton icon={Rewind} title={t("lastGame")} />
        </div>
    );
}
