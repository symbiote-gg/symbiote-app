import { Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardHeader, Eyebrow, Skeleton, Typography } from "@/ui";

import styles from "./styles.module.css";

const TILES = 6;

export function BestsSkeleton() {
    const t = useTranslations("hero.bests");

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Trophy}
                title={t("title")}
                subtitle={<Skeleton className={styles.subtitleBar} />}
            />
            <ul className={styles.tiles}>
                {Array.from({ length: TILES }, (_, i) => (
                    <li key={i} className={styles.item}>
                        <div className={styles.tile}>
                            <Eyebrow>
                                <Skeleton />
                            </Eyebrow>
                            <div className={styles.body}>
                                <Typography display className={styles.value}>
                                    <Skeleton className={styles.valueBar} />
                                </Typography>
                                <Typography size="sm">
                                    <Skeleton className={styles.detailBar} />
                                </Typography>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
