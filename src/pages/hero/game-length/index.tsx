import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import type { GameLength as Length } from "@/api/heroes";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader, Meter, Typography, WinRate } from "@/ui";
import { isJudged, winRate } from "@/utils/hero-stats";

import styles from "./styles.module.css";

const strong = (chunks: ReactNode) => <strong>{chunks}</strong>;

export interface GameLengthProps {
    lengths: Length[];
}

export function GameLength({ lengths }: GameLengthProps) {
    const t = useTranslations("hero.gameLength");
    const { winPercent } = useFormatStat();

    const rows = lengths.map((length) => ({
        ...length,
        rate: winRate(length.wins, length.losses),
        judged: isJudged(length.wins, length.losses),
        from: length.from / 60,
        to: length.to === null ? null : length.to / 60,
    }));

    const best = rows
        .filter((row) => row.judged && row.rate !== null)
        .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];

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
                <ul className={styles.rows}>
                    {rows.map((row) => (
                        <li key={row.from} className={styles.row}>
                            <Typography size="sm" noWrap>
                                {t(`label.${span(row)}`, {
                                    from: row.from,
                                    to: row.to ?? 0,
                                })}
                            </Typography>
                            <Meter
                                value={row.rate ?? 0}
                                neutral={!row.judged}
                                className={styles.meter}
                            />
                            <Typography
                                size="xs"
                                weight="semibold"
                                mono
                                className={styles.rate}
                            >
                                <WinRate rate={row.rate} judged={row.judged} />
                            </Typography>
                            <Typography
                                size="xs"
                                variant="tertiary"
                                mono
                                className={styles.games}
                            >
                                {row.games}
                            </Typography>
                        </li>
                    ))}
                </ul>
                {best && best.rate !== null && (
                    <Typography
                        size="sm"
                        variant="secondary"
                        className={styles.note}
                    >
                        {t.rich(`best.${span(best)}`, {
                            rate: winPercent(best.rate),
                            from: best.from,
                            to: best.to ?? 0,
                            b: strong,
                        })}
                    </Typography>
                )}
            </div>
        </Card>
    );
}
