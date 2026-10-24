import classNames from "classnames";
import { Fragment } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Kad } from "@/components";
import { Card, Eyebrow, TableHead, Typography } from "@/ui";
import { PlayerRow } from "./player-row";
import { STATS, type Stat } from "./stats";
import { type Kills, TeamKills } from "./team-kills";

import styles from "./styles.module.css";

export interface ScoreboardTeam {
    ally: boolean;
    level: number | null;
    players: ReplayPlayerDetail[];
}

export interface ScoreboardProps {
    teams: ScoreboardTeam[];
    ownerId: number;
    duration: number;
}

const sum = (
    players: ReplayPlayerDetail[],
    pick: (p: ReplayPlayerDetail) => number | null,
) => players.reduce((total, p) => total + (pick(p) ?? 0), 0);

export function Scoreboard({ teams, ownerId, duration }: ScoreboardProps) {
    const t = useTranslations("replay");
    const format = useFormatter();

    const allPlayers = teams.flatMap((team) => team.players);
    const maxByStat = Object.fromEntries(
        STATS.map(({ stat }) => [
            stat,
            Math.max(0, ...allPlayers.map((p) => p[stat] ?? 0)),
        ]),
    ) as Record<Stat, number>;

    const killsOf = (ally: boolean): Kills => {
        const own = teams.find((team) => team.ally === ally)?.players ?? [];
        const other = teams.find((team) => team.ally !== ally)?.players ?? [];
        const heroes = sum(own, (p) => p.kills);

        return {
            heroes,
            ai: Math.max(0, sum(other, (p) => p.deaths) - heroes),
        };
    };

    const levelOf = (ally: boolean) =>
        teams.find((team) => team.ally === ally)?.level ?? null;

    const formatStat = (value: number | null) =>
        value === null
            ? "-"
            : format.number(value, {
                  notation: "compact",
                  maximumFractionDigits: 1,
              });

    return (
        <div className={styles.root}>
            <Card className={styles.card}>
                <TeamKills
                    ally={killsOf(true)}
                    enemy={killsOf(false)}
                    allyLevel={levelOf(true)}
                    enemyLevel={levelOf(false)}
                    duration={duration}
                />
                <div className={styles.scroll}>
                    <div className={styles.table}>
                        <TableHead
                            className={classNames(
                                styles.teamGrid,
                                styles.headerRow,
                            )}
                            columns={[
                                { key: "player", label: t("player") },
                                {
                                    key: "talents",
                                    label: t("talents"),
                                    className: styles.talents,
                                },
                                {
                                    key: "kad",
                                    label: t("kad"),
                                    className: styles.number,
                                },
                                ...STATS.map(({ stat, label, secondary }) => ({
                                    key: stat,
                                    label: t(label),
                                    className: classNames(styles.number, {
                                        [styles.secondary]: secondary,
                                    }),
                                })),
                            ]}
                        />
                        {teams.map(({ ally, players }) => {
                            const kills = sum(players, (p) => p.kills);
                            const assists = sum(players, (p) => p.assists);
                            const deaths = sum(players, (p) => p.deaths);

                            return (
                                <Fragment key={ally ? "ally" : "enemy"}>
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
                                        <Eyebrow>{t("teamTotal")}</Eyebrow>
                                        <span />
                                        <Typography
                                            size="xs"
                                            variant="tertiary"
                                            mono
                                            noWrap
                                            className={styles.number}
                                        >
                                            <Kad
                                                kills={kills}
                                                assists={assists}
                                                deaths={deaths}
                                            />
                                        </Typography>
                                        {STATS.map(({ stat, secondary }) => (
                                            <Typography
                                                key={stat}
                                                size="xs"
                                                variant="tertiary"
                                                mono
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
                                                {formatStat(
                                                    sum(
                                                        players,
                                                        (p) => p[stat],
                                                    ),
                                                )}
                                            </Typography>
                                        ))}
                                    </div>
                                </Fragment>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </div>
    );
}
