import { noop, useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { memo } from "react";
import { useFormatter, useTranslations } from "use-intl";
import { Link } from "wouter";

import {
    REPLAY_LISTS_KEY,
    type ReplayListData,
    markSeenInPages,
    replayQuery,
} from "@/api/queries";
import { type Replay, markReplayAsSeen } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { formatDuration, usePlayedAt } from "@/utils/dates";
import { AwardPills } from "../award-pill";
import { HeroPortrait } from "../hero-portrait";
import { Kad } from "../kad";
import { ModeLabel } from "../mode-icon";
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
        queryClient.setQueriesData<ReplayListData>(
            { queryKey: REPLAY_LISTS_KEY },
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
                        className={styles.portrait}
                    />
                    <span className={styles.text}>
                        <Typography truncate className={styles.title}>
                            <span className={styles.hero}>
                                {replay.heroName}
                            </span>
                            <span className={styles.map}>{replay.mapName}</span>
                        </Typography>
                        <AwardPills awards={replay.ownerAwards} />
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
                    variant="tertiary"
                    noWrap
                    className={classNames(columns.col, columns.mode)}
                >
                    <ModeLabel
                        mode={replay.mode}
                        iconClassName={styles.modeIcon}
                    />
                </Typography>
                <Typography
                    size="sm"
                    variant="tertiary"
                    mono
                    noWrap
                    className={classNames(columns.col, columns.kad)}
                >
                    <Kad
                        kills={replay.ownerKills}
                        assists={replay.ownerAssists}
                        deaths={replay.ownerDeaths}
                    />
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
                    variant="tertiary"
                    mono
                    noWrap
                    className={classNames(columns.col, columns.duration)}
                >
                    {formatDuration(replay.duration)}
                </Typography>
                <Typography
                    size="xs"
                    variant="tertiary"
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
