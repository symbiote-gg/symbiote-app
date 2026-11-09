import { revealItemInDir } from "@tauri-apps/plugin-opener";
import classNames from "classnames";
import { Folder, History, MonitorPlay } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Link } from "wouter";

import type { HeroRole, ReplayDetail, ReplayPlayerDetail } from "@/api/replays";
import {
    BackLink,
    HeroPortrait,
    Kad,
    ResultChip,
    modeIcon,
} from "@/components";
import { useFormatStat } from "@/hooks/useFormatStat";
import { useImageFallback } from "@/hooks/useImageFallback";
import { useWatchReplay } from "@/hooks/useWatchReplay";
import { Button, Chip, Stat, Tooltip, Typography, sideClasses } from "@/ui";
import { formatDuration, usePlayedOn } from "@/utils/dates";
import { matchResult } from "@/utils/result";
import { FlowChip } from "./flow-chip";

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
    const { compact, percent } = useFormatStat();
    const playedOn = usePlayedOn();
    const [failed, onError] = useImageFallback();

    const watch = useWatchReplay();

    const onReveal = () => revealItemInDir(replay.path);
    const onWatch = () => watch.mutate(replay.id);

    const result = matchResult(replay.ownerWin);

    const kad = owner ? (
        <Kad
            kills={owner.kills}
            assists={owner.assists}
            deaths={owner.deaths}
        />
    ) : (
        "-"
    );

    const killParticipation = percent(replay.ownerKillParticipation);

    const timeDead =
        owner?.timeDead != null ? formatDuration(owner.timeDead) : "-";

    const timeOnFire =
        owner?.timeOnFire != null ? formatDuration(owner.timeOnFire) : "-";

    const played = playedOn(replay.timestamp);

    const roleStat = ROLE_STAT[replay.heroRole ?? "ranged_assassin"];

    const reached = replay.timeline.milestones;

    const stats: HeaderStat[] = [
        { label: t("replay.kad"), value: kad },
        { label: t("replay.killParticipation"), value: killParticipation },
        {
            label: t("replay.heroDamage"),
            value: compact(owner?.heroDamage),
        },
        {
            label: t(`replay.${roleStat}`),
            value: compact(owner?.[roleStat]),
        },
        { label: t("replay.timeDead"), value: timeDead },
        { label: t("replay.timeOnFire"), value: timeOnFire },
    ];

    return (
        <header className={classNames(styles.root, styles[result])}>
            <div className={styles.hero}>
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
                        <BackLink
                            href="/replays"
                            label={t("replay.replays")}
                            className={styles.tool}
                        />
                        <div className={styles.actions}>
                            {replay.eventsExpired && (
                                <Typography size="sm" className={styles.notice}>
                                    <History />
                                    {t("replay.eventsExpired")}
                                </Typography>
                            )}
                            {replay.onDisk && (
                                <Tooltip
                                    content={t("replay.watchInGame")}
                                    description={t(
                                        "replay.watchInGameDescription",
                                    )}
                                    placement="bottom"
                                >
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={onWatch}
                                        disabled={watch.isPending}
                                        aria-label={t("replay.watchInGame")}
                                        className={styles.tool}
                                    >
                                        <MonitorPlay />
                                        <span className={styles.toolLabel}>
                                            {t("replay.watchInGame")}
                                        </span>
                                    </Button>
                                </Tooltip>
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
                            <Link
                                href={`/heroes/${replay.ownerHeroId}`}
                                className={styles.portrait}
                            >
                                <HeroPortrait
                                    name={replay.heroName}
                                    portrait={replay.heroPortrait}
                                    size="xl"
                                    className={styles.portraitImage}
                                />
                            </Link>
                            <div className={styles.text}>
                                <div className={styles.facts}>
                                    {result !== "unknown" && (
                                        <ResultChip
                                            win={replay.ownerWin}
                                            className={classNames(
                                                styles.tag,
                                                styles.resultTag,
                                            )}
                                        />
                                    )}
                                    <Chip
                                        size="sm"
                                        icon={modeIcon(replay.mode)}
                                        uppercase
                                        className={styles.tag}
                                    >
                                        {t(`modes.${replay.mode}`)}
                                    </Chip>
                                    {replay.flow &&
                                        replay.ownerWin !== null && (
                                            <FlowChip
                                                flow={replay.flow}
                                                ownerWin={replay.ownerWin}
                                                className={classNames(
                                                    styles.tag,
                                                    styles.flowTag,
                                                )}
                                            />
                                        )}
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
                                            team === allyTeam
                                                ? "ally"
                                                : "enemy";

                                        return (
                                            <div
                                                key={kind}
                                                className={classNames(
                                                    styles.moment,
                                                    sideClasses(side),
                                                )}
                                            >
                                                <Typography
                                                    size="xs"
                                                    variant="tertiary"
                                                    noWrap
                                                >
                                                    {t(
                                                        `replay.milestone.${kind}`,
                                                    )}
                                                </Typography>
                                                <Typography
                                                    size="xs"
                                                    weight="semibold"
                                                    mono
                                                    noWrap
                                                >
                                                    {formatDuration(time)}
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
                            <div className={styles.verdict}>
                                <Typography
                                    size="lg"
                                    weight="semibold"
                                    display
                                    uppercase
                                    noWrap
                                    className={styles.result}
                                >
                                    {t(`result.${result}`)}
                                </Typography>
                                {replay.flow && replay.ownerWin !== null && (
                                    <FlowChip
                                        flow={replay.flow}
                                        ownerWin={replay.ownerWin}
                                        size="md"
                                    />
                                )}
                            </div>
                            <dl className={styles.panel}>
                                {stats.map(({ label, value }) => (
                                    <Stat
                                        key={label}
                                        label={label}
                                        className={styles.stat}
                                    >
                                        {value}
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
