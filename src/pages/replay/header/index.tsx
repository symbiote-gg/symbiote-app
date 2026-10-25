import { revealItemInDir } from "@tauri-apps/plugin-opener";
import classNames from "classnames";
import { Folder, History } from "lucide-react";
import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroRole, ReplayDetail, ReplayPlayerDetail } from "@/api/replays";
import { BackToReplays, HeroPortrait, Kad, modeIcon } from "@/components";
import { useImageFallback } from "@/hooks/useImageFallback";
import { Button, Chip, Eyebrow, Typography } from "@/ui";
import { formatDuration, usePlayedOn } from "@/utils/dates";

import styles from "./styles.module.css";

type RoleStat = "siegeDamage" | "healing" | "damageTaken";

const ROLE_STAT: Record<HeroRole, RoleStat> = {
    tank: "damageTaken",
    bruiser: "damageTaken",
    healer: "healing",
    support: "healing",
    melee_assassin: "siegeDamage",
    ranged_assassin: "siegeDamage",
};

export interface HeaderProps {
    replay: ReplayDetail;
    owner: ReplayPlayerDetail | undefined;
    allyTeam: number;
}

interface HeaderStat {
    label: string;
    value: ReactNode;
}

export function Header({ replay, owner, allyTeam }: HeaderProps) {
    const t = useTranslations();
    const format = useFormatter();
    const playedOn = usePlayedOn();
    const [failed, onError] = useImageFallback();

    const onReveal = () => revealItemInDir(replay.path);

    const result =
        replay.ownerWin === null ? "unknown" : replay.ownerWin ? "win" : "loss";

    const formatStat = (value: number | null | undefined) =>
        value
            ? format.number(value, {
                  notation: "compact",
                  maximumFractionDigits: 1,
              })
            : "-";

    const kad = owner ? (
        <Kad
            kills={owner.kills}
            assists={owner.assists}
            deaths={owner.deaths}
        />
    ) : (
        "-"
    );

    const killParticipation =
        replay.ownerKillParticipation === null
            ? "-"
            : format.number(replay.ownerKillParticipation, {
                  style: "percent",
              });

    const timeDead =
        owner?.timeDead != null
            ? formatDuration(Math.round(owner.timeDead))
            : "-";

    const timeOnFire =
        owner?.timeOnFire != null
            ? formatDuration(Math.round(owner.timeOnFire))
            : "-";

    const played = playedOn(replay.timestamp);

    const roleStat = ROLE_STAT[replay.heroRole ?? "ranged_assassin"];

    const reached = replay.timeline.milestones;

    const stats: HeaderStat[] = [
        { label: t("replay.kad"), value: kad },
        { label: t("replay.killParticipation"), value: killParticipation },
        {
            label: t("replay.heroDamage"),
            value: formatStat(owner?.heroDamage),
        },
        {
            label: t(`replay.${roleStat}`),
            value: formatStat(owner?.[roleStat]),
        },
        { label: t("replay.timeDead"), value: timeDead },
        { label: t("replay.timeOnFire"), value: timeOnFire },
    ];

    return (
        <header className={classNames(styles.root, styles[result])}>
            {replay.mapLoadingScreen && !failed && (
                <img
                    src={`/game/loadingscreens/${replay.mapLoadingScreen}`}
                    alt=""
                    decoding="sync"
                    className={styles.art}
                    onError={onError}
                />
            )}
            <div className={styles.shade} />
            <div className={styles.glow} />
            <div className={styles.content}>
                <div className={styles.toolbar}>
                    <BackToReplays className={styles.tool} />
                    <div className={styles.actions}>
                        {replay.eventsExpired && (
                            <Typography size="sm" className={styles.notice}>
                                <History />
                                {t("replay.eventsExpired")}
                            </Typography>
                        )}
                        {replay.onDisk && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onReveal}
                                aria-label={t("replay.showInFolder")}
                                className={styles.tool}
                            >
                                <Folder />
                                <span className={styles.toolLabel}>
                                    {t("replay.showInFolder")}
                                </span>
                            </Button>
                        )}
                    </div>
                </div>
                <div className={styles.summary}>
                    <div className={styles.identity}>
                        <span className={styles.portrait}>
                            <HeroPortrait
                                name={replay.heroName}
                                portrait={replay.heroPortrait}
                                size="lg"
                                className={styles.portraitImage}
                            />
                        </span>
                        <div className={styles.text}>
                            <div className={styles.facts}>
                                {result !== "unknown" && (
                                    <Chip
                                        size="sm"
                                        tone={result}
                                        uppercase
                                        className={classNames(
                                            styles.tag,
                                            styles.resultTag,
                                        )}
                                    >
                                        {t("replay.result", { result })}
                                    </Chip>
                                )}
                                <Chip
                                    size="sm"
                                    icon={modeIcon(replay.mode)}
                                    uppercase
                                    className={styles.tag}
                                >
                                    {t(`modes.${replay.mode}`)}
                                </Chip>

                                <Typography
                                    size="sm"
                                    noWrap
                                    className={styles.fact}
                                >
                                    {played}
                                </Typography>
                            </div>
                            <Typography
                                size="xl2"
                                weight="semibold"
                                display
                                uppercase
                                className={styles.title}
                            >
                                {replay.mapName}
                            </Typography>
                        </div>
                        {reached.length > 0 && (
                            <div className={styles.moments}>
                                {reached.map(({ kind, team, time }) => {
                                    const side =
                                        team === allyTeam ? "ally" : "enemy";

                                    return (
                                        <div
                                            key={kind}
                                            className={classNames(
                                                styles.moment,
                                                styles[side],
                                            )}
                                        >
                                            <Typography
                                                size="xs"
                                                variant="tertiary"
                                                noWrap
                                            >
                                                {t(`replay.milestone.${kind}`)}
                                            </Typography>
                                            <Typography
                                                size="xs"
                                                weight="semibold"
                                                mono
                                                noWrap
                                            >
                                                {formatDuration(
                                                    Math.round(time),
                                                )}
                                            </Typography>
                                            <Typography
                                                size="xs"
                                                weight="semibold"
                                                noWrap
                                                className={styles.side}
                                            >
                                                {t("replay.milestoneSide", {
                                                    side,
                                                })}
                                            </Typography>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className={styles.outcome}>
                        <Typography
                            size="lg"
                            weight="semibold"
                            display
                            uppercase
                            noWrap
                            className={styles.result}
                        >
                            {t("replay.result", { result })}
                        </Typography>
                        <div className={styles.panel}>
                            {stats.map(({ label, value }) => (
                                <div key={label} className={styles.stat}>
                                    <Eyebrow noWrap>{label}</Eyebrow>
                                    <Typography
                                        weight="semibold"
                                        mono
                                        noWrap
                                        className={styles.statValue}
                                    >
                                        {value}
                                    </Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
