import { useTranslations } from "use-intl";

import { BackLink } from "@/components";
import { Skeleton, Stat, Typography } from "@/ui";

import styles from "./styles.module.css";

const MOMENTS = 3;
const STATS = 6;

export function HeaderSkeleton() {
    const t = useTranslations("replay");

    return (
        <header className={styles.root}>
            <div className={styles.hero}>
                <div className={styles.shade} />
                <div className={styles.content}>
                    <div className={styles.toolbar}>
                        <BackLink
                            href="/replays"
                            label={t("replays")}
                            className={styles.tool}
                        />
                    </div>
                    <div className={styles.summary}>
                        <div className={styles.identity}>
                            <Skeleton className={styles.portraitBar} />
                            <div className={styles.text}>
                                <div className={styles.facts}>
                                    <Skeleton className={styles.factsBar} />
                                </div>
                                <Typography
                                    size="xl2"
                                    weight="semibold"
                                    display
                                    uppercase
                                    className={styles.title}
                                >
                                    <Skeleton className={styles.titleBar} />
                                </Typography>
                            </div>
                            <div className={styles.moments}>
                                {Array.from({ length: MOMENTS }, (_, i) => (
                                    <div key={i} className={styles.moment}>
                                        <Typography size="xs">
                                            <Skeleton
                                                className={styles.momentBar}
                                            />
                                        </Typography>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.outcome}>
                            <div className={styles.verdict}>
                                <Typography
                                    size="lg"
                                    weight="semibold"
                                    display
                                    uppercase
                                    noWrap
                                    className={styles.result}
                                >
                                    <Skeleton className={styles.resultBar} />
                                </Typography>
                            </div>
                            <dl className={styles.panel}>
                                {Array.from({ length: STATS }, (_, i) => (
                                    <Stat
                                        key={i}
                                        label={<Skeleton />}
                                        className={styles.stat}
                                    >
                                        <Skeleton
                                            className={styles.statValueBar}
                                        />
                                    </Stat>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
