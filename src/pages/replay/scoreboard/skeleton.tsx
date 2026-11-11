import classNames from "classnames";
import { Fragment } from "react";
import { useTranslations } from "use-intl";

import { Card, Eyebrow, Skeleton, TableHead, Typography } from "@/ui";
import { useColumns } from "./columns";
import { PlayerRowSkeleton } from "./player-row/skeleton";
import { STATS } from "./stats";
import { TeamKillsSkeleton } from "./team-kills/skeleton";

import styles from "./styles.module.css";

const TEAMS = ["ally", "enemy"];
const PLAYERS = 5;

export function ScoreboardSkeleton() {
    const t = useTranslations("replay");
    const columns = useColumns();

    return (
        <div className={styles.root}>
            <Card className={styles.card}>
                <TeamKillsSkeleton />
                <div className={styles.scroll}>
                    <div className={styles.table}>
                        <TableHead
                            className={classNames(
                                styles.teamGrid,
                                styles.headerRow,
                            )}
                            columns={columns}
                        />
                        {TEAMS.map((team) => (
                            <Fragment key={team}>
                                {Array.from({ length: PLAYERS }, (_, i) => (
                                    <PlayerRowSkeleton
                                        key={i}
                                        className={styles.teamGrid}
                                    />
                                ))}
                                <div
                                    className={classNames(
                                        styles.teamGrid,
                                        styles.totalRow,
                                    )}
                                >
                                    <Eyebrow>{t("teamTotal")}</Eyebrow>
                                    <span />
                                    <Typography
                                        size="xs"
                                        noWrap
                                        className={styles.number}
                                    >
                                        <Skeleton className={styles.totalBar} />
                                    </Typography>
                                    {STATS.map(({ stat, secondary }) => (
                                        <Typography
                                            key={stat}
                                            size="xs"
                                            noWrap
                                            className={classNames(
                                                styles.number,
                                                styles.totalValue,
                                                {
                                                    [styles.secondary]:
                                                        secondary,
                                                },
                                            )}
                                        >
                                            <Skeleton
                                                className={styles.totalBar}
                                            />
                                        </Typography>
                                    ))}
                                </div>
                            </Fragment>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    );
}
