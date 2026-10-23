import { noop, useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { memo } from "react";
import { useFormatter, useTranslations } from "use-intl";
import { Link } from "wouter";

import { markSeenInPages, replayQuery, replaysQuery } from "@/api/queries";
import { type Replay, markReplayAsSeen } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { formatDuration, usePlayedAt } from "@/utils/dates";
import { AwardPill } from "../award-pill";
import { HeroPortrait } from "../hero-portrait";
import { ModeIcon } from "../mode-icon";
import { ResultChip } from "../result-chip";
import { Teams } from "./teams";

import columns from "./columns.module.css";
import styles from "./styles.module.css";

export interface ReplayRowProps {
    replay: Replay;
    now?: Date;
    wide?: boolean;
    className?: string;
}

export const ReplayRow = memo(function ReplayRow({
    replay,
    now,
    wide,
    className,
}: ReplayRowProps) {
    const t = useTranslations();
    const format = useFormatter();
    const playedAt = usePlayedAt();
    const queryClient = useQueryClient();

    const onPointerEnter = () =>
        queryClient.query(replayQuery(replay.id)).catch(noop);

    const onClick = () => {
        if (!replay.isNew) return;
        queryClient.setQueryData(
            replaysQuery.queryKey,
            (data) => data && markSeenInPages(data, replay.id),
        );
        markReplayAsSeen(replay.id).catch(noop);
    };

    const heroDamage =
        replay.ownerHeroDamage === null
            ? "-"
            : format.number(replay.ownerHeroDamage, {
                  notation: "compact",
                  maximumFractionDigits: 1,
              });

    return (
        <Link
            href={`/replays/${replay.id}`}
            className={classNames(className, columns.row, styles.root, {
                [styles.new]: replay.isNew,
                [columns.wide]: wide,
            })}
            onPointerEnter={onPointerEnter}
            onClick={onClick}
        >
            <span className={columns.inner}>
                <span className={columns.game}>
                    <HeroPortrait
                        name={replay.heroName}
                        portrait={replay.heroPortrait}
                        size="md"
                        highlight={replay.ownerAwards.some(
                            (award) => award.type === "mvp",
                        )}
                        className={styles.portrait}
                    />
                    <span className={styles.text}>
                        <Typography truncate className={styles.title}>
                            <span className={styles.hero}>
                                {replay.heroName}
                            </span>
                            <span className={styles.map}>{replay.mapName}</span>
                        </Typography>
                        {replay.ownerAwards.map((award) => (
                            <AwardPill key={award.type} award={award} />
                        ))}
                        {replay.isNew && (
                            <span className={styles.badge}>
                                {t("replayRow.new")}
                            </span>
                        )}
                    </span>
                </span>
                {wide && <Teams replay={replay} className={columns.teams} />}
                <Typography
                    size="sm"
                    variant="secondary"
                    noWrap
                    className={classNames(columns.col, columns.mode)}
                >
                    <ModeIcon mode={replay.mode} className={styles.modeIcon} />
                    {t(`modes.${replay.mode}`)}
                </Typography>
                <Typography
                    size="sm"
                    variant="secondary"
                    mono
                    noWrap
                    className={classNames(columns.col, columns.kda, styles.kda)}
                >
                    {replay.ownerKills === null ? (
                        "-"
                    ) : (
                        <>
                            <span className={styles.kills}>
                                {replay.ownerKills}
                            </span>
                            <span className={styles.slash}>/</span>
                            {replay.ownerAssists ?? 0}
                            <span className={styles.slash}>/</span>
                            <span
                                className={
                                    replay.ownerDeaths
                                        ? styles.deaths
                                        : styles.deathless
                                }
                            >
                                {replay.ownerDeaths ?? 0}
                            </span>
                        </>
                    )}
                </Typography>
                <Typography
                    size="sm"
                    mono
                    noWrap
                    weight={replay.ownerHeroDamageTop ? "semibold" : "regular"}
                    className={classNames(columns.col, columns.damage)}
                >
                    {replay.ownerHeroDamageTop ? (
                        <Tooltip
                            content={t("replayRow.topDamage", {
                                hero: replay.heroName,
                            })}
                        >
                            <span className={styles.topDamage}>
                                {heroDamage}
                            </span>
                        </Tooltip>
                    ) : (
                        heroDamage
                    )}
                </Typography>
                <Typography
                    size="sm"
                    variant="secondary"
                    mono
                    noWrap
                    className={classNames(columns.col, columns.duration)}
                >
                    {formatDuration(replay.duration)}
                </Typography>
                <Typography
                    size="xs"
                    variant="secondary"
                    mono
                    noWrap
                    className={columns.time}
                >
                    {playedAt(replay.timestamp, now)}
                </Typography>
                <ResultChip win={replay.ownerWin} className={columns.result} />
            </span>
        </Link>
    );
});
