import classNames from "classnames";
import { Clock } from "lucide-react";
import { useTranslations } from "use-intl";

import type { GameLength as Length } from "@/api/heroes";
import { Card, CardHeader, Eyebrow, Meter, Typography, WinRate } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

export interface GameLengthProps {
    lengths: Length[];
}

export function GameLength({ lengths }: GameLengthProps) {
    const t = useTranslations("hero.gameLength");

    const rows = lengths.map((length) => ({
        ...length,
        rate: winRate(length.wins, length.losses),
        judged: isJudged(length.wins, length.losses),
        from: length.from / 60,
        to: length.to === null ? null : length.to / 60,
    }));

    const span = (row: (typeof rows)[number]) =>
        row.to === null ? "over" : row.from === 0 ? "under" : "between";

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Clock}
                title={t("title")}
                subtitle={t("subtitle")}
            />
            <div className={styles.body}>
                <ul className={styles.tiles}>
                    {rows.map((row) => (
                        <li key={row.from} className={styles.tile}>
                            <Eyebrow as="h3" className={styles.label}>
                                {t(`label.${span(row)}`, {
                                    from: row.from,
                                    to: row.to ?? 0,
                                })}
                            </Eyebrow>
                            <span
                                className={classNames(styles.stats, {
                                    [styles.few]: !row.judged,
                                })}
                            >
                                <span className={styles.figures}>
                                    {row.rate === null ? (
                                        <Typography
                                            as="span"
                                            size="xs"
                                            variant="secondary"
                                        >
                                            {row.games === 0
                                                ? t("noGames")
                                                : t("noResult")}
                                        </Typography>
                                    ) : (
                                        <Typography
                                            as="span"
                                            display
                                            className={styles.rate}
                                        >
                                            <WinRate
                                                rate={row.rate}
                                                judged={row.judged}
                                            />
                                        </Typography>
                                    )}
                                    {row.games > 0 && (
                                        <Typography
                                            as="span"
                                            size="xs"
                                            variant="secondary"
                                        >
                                            {t("games", { count: row.games })}
                                        </Typography>
                                    )}
                                </span>
                                <Meter
                                    value={row.rate ?? 0}
                                    neutral={!row.judged}
                                    className={styles.meter}
                                />
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
}
