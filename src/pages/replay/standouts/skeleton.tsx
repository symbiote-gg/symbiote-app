import classNames from "classnames";
import { ScanSearch } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardHeader, Eyebrow, Skeleton, Typography } from "@/ui";

import styles from "./styles.module.css";

const TILES = 3;

export function StandoutsSkeleton() {
    const t = useTranslations("replay.standouts");

    return (
        <Card className={styles.standouts}>
            <CardHeader
                icon={ScanSearch}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <ul className={styles.tiles}>
                {Array.from({ length: TILES }, (_, i) => (
                    <li
                        key={i}
                        className={classNames(styles.tile, styles.tileSkeleton)}
                    >
                        <Skeleton className={styles.iconBar} />
                        <div className={styles.text}>
                            <Eyebrow>
                                <Skeleton />
                            </Eyebrow>
                            <div className={styles.figure}>
                                <Typography display className={styles.value}>
                                    <Skeleton className={styles.valueBar} />
                                </Typography>
                            </div>
                            <Typography size="sm">
                                <Skeleton className={styles.sentenceBar} />
                            </Typography>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
