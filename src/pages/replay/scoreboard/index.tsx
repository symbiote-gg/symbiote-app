import classNames from "classnames";
import { Fragment } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Card, Typography } from "@/ui";
import { PlayerRow } from "./player-row";
import { STATS, type Stat } from "./stats";

import styles from "./styles.module.css";

export interface ScoreboardTeam {
    ally: boolean;
    level: number | null;
    players: ReplayPlayerDetail[];
}

export interface ScoreboardProps {
    teams: ScoreboardTeam[];
    ownerId: string;
}

const sum = (
    players: ReplayPlayerDetail[],
    pick: (p: ReplayPlayerDetail) => number | null,
) => players.reduce((total, p) => total + (pick(p) ?? 0), 0);

export function Scoreboard({ teams, ownerId }: ScoreboardProps) {
    const t = useTranslations("replay");
    const format = useFormatter();

    const allPlayers = teams.flatMap((team) => team.players);
    const maxByStat = Object.fromEntries(
        STATS.map(({ stat }) => [
            stat,
            Math.max(0, ...allPlayers.map((p) => p[stat] ?? 0)),
        ]),
    ) as Record<Stat, number>;

    const formatStat = (value: number | null) =>
        value
            ? format.number(value, {
                  notation: "compact",
                  maximumFractionDigits: 1,
              })
            : "-";

    return (
        <div className={styles.root}>
            <Card className={styles.card}>
                <div className={styles.table}>
                    <div
                        className={classNames(
                            styles.teamGrid,
                            styles.headerRow,
                        )}
                    >
                        <Typography size="xs" variant="secondary" uppercase>
                            {t("player")}
                        </Typography>
                        <Typography
                            size="xs"
                            variant="secondary"
                            uppercase
                            className={styles.number}
                        >
                            {t("kda")}
                        </Typography>
                        {STATS.map(({ stat, label, wide }) => (
                            <Typography
                                key={stat}
                                size="xs"
                                variant="secondary"
                                uppercase
                                noWrap
                                className={classNames(styles.number, {
                                    [styles.wide]: wide,
                                })}
                            >
                                {t(label)}
                            </Typography>
                        ))}
                        <Typography size="xs" variant="secondary" uppercase>
                            {t("talents")}
                        </Typography>
                    </div>
                    {teams.map(({ ally, level, players }) => {
                        const kills = sum(players, (p) => p.kills);
                        const assists = sum(players, (p) => p.assists);
                        const deaths = sum(players, (p) => p.deaths);

                        return (
                            <Fragment key={ally ? "ally" : "enemy"}>
                                <div
                                    className={classNames(
                                        styles.teamTitle,
                                        ally ? styles.ally : styles.enemy,
                                    )}
                                >
                                    <Typography
                                        size="lg"
                                        weight="semibold"
                                        display
                                        uppercase
                                        className={styles.title}
                                    >
                                        {t("team", {
                                            side: ally ? "ally" : "enemy",
                                        })}
                                    </Typography>
                                    <Typography
                                        size="xs"
                                        variant="secondary"
                                        mono
                                        noWrap
                                        className={styles.chip}
                                    >
                                        {t("kills", { kills })}
                                    </Typography>
                                    {level !== null && (
                                        <Typography
                                            size="xs"
                                            variant="secondary"
                                            mono
                                            noWrap
                                            className={styles.chip}
                                        >
                                            {t("level", { level })}
                                        </Typography>
                                    )}
                                </div>
                                {players.map((player) => (
                                    <PlayerRow
                                        key={player.playerId}
                                        className={styles.teamGrid}
                                        player={player}
                                        ally={ally}
                                        owner={player.playerId === ownerId}
                                        maxByStat={maxByStat}
                                        formatStat={formatStat}
                                    />
                                ))}
                                <div
                                    className={classNames(
                                        styles.teamGrid,
                                        styles.totalRow,
                                    )}
                                >
                                    <Typography
                                        size="xs"
                                        weight="semibold"
                                        variant="secondary"
                                        uppercase
                                    >
                                        {t("teamTotal")}
                                    </Typography>
                                    <Typography
                                        size="xs"
                                        variant="secondary"
                                        mono
                                        noWrap
                                        className={styles.number}
                                    >
                                        {`${kills}/${assists}/${deaths}`}
                                    </Typography>
                                    {STATS.map(({ stat, wide }) => (
                                        <Typography
                                            key={stat}
                                            size="xs"
                                            variant="secondary"
                                            mono
                                            noWrap
                                            className={classNames(
                                                styles.number,
                                                styles.totalValue,
                                                { [styles.wide]: wide },
                                            )}
                                        >
                                            {formatStat(
                                                sum(players, (p) => p[stat]),
                                            )}
                                        </Typography>
                                    ))}
                                    <span />
                                </div>
                            </Fragment>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
