import classNames from "classnames";
import { Calendar, Clock } from "lucide-react";
import { useState } from "react";
import { useFormatter, useTranslations } from "use-intl";
import { Link } from "wouter";

import type { ReplayDetail, ReplayPlayerDetail } from "@/api/replays";
import { HeroPortrait, ModeIcon } from "@/components";
import { Typography } from "@/ui";
import { formatDuration, playedFormat } from "@/utils/dates";

import styles from "./styles.module.css";

export interface HeaderProps {
    replay: ReplayDetail;
    owner: ReplayPlayerDetail | undefined;
    level: number | null;
}

export function Header({ replay, owner, level }: HeaderProps) {
    const t = useTranslations();
    const format = useFormatter();
    const [failed, setFailed] = useState(false);

    const onError = () => setFailed(true);

    const result =
        replay.ownerWin === null ? "unknown" : replay.ownerWin ? "win" : "loss";

    const formatStat = (value: number | null | undefined) =>
        value
            ? format.number(value, {
                  notation: "compact",
                  maximumFractionDigits: 1,
              })
            : "-";

    const kda = owner
        ? [owner.kills, owner.assists, owner.deaths]
              .map((value) => value ?? "-")
              .join(" / ")
        : "-";

    const meta = [
        {
            icon: <ModeIcon mode={replay.mode} />,
            label: t(`modes.${replay.mode}`),
        },
        { icon: <Clock />, label: formatDuration(replay.duration) },
        {
            icon: <Calendar />,
            label: format.dateTime(
                new Date(replay.timestamp),
                playedFormat(replay.timestamp),
            ),
        },
    ];

    const stats = [
        { label: t("replay.kda"), value: kda },
        {
            label: t("replay.heroDamage"),
            value: formatStat(owner?.heroDamage),
        },
        {
            label: t("replay.siegeDamage"),
            value: formatStat(owner?.siegeDamage),
        },
        { label: t("replay.xpContribution"), value: formatStat(owner?.xp) },
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
                <Link href="/replays" className={styles.back}>
                    <Typography size="sm" variant="secondary">
                        {t("replay.back")}
                    </Typography>
                </Link>
                <div className={styles.summary}>
                    <div className={styles.identity}>
                        <span className={styles.portrait}>
                            <HeroPortrait
                                name={replay.heroName}
                                portrait={replay.heroPortrait}
                                size="lg"
                                className={styles.portraitImage}
                            />
                            {level !== null && (
                                <Typography
                                    size="xs"
                                    weight="semibold"
                                    mono
                                    noWrap
                                    className={styles.level}
                                >
                                    {t("replay.level", { level })}
                                </Typography>
                            )}
                        </span>
                        <div className={styles.text}>
                            <Typography
                                size="xl2"
                                weight="semibold"
                                display
                                uppercase
                                truncate
                                className={styles.title}
                            >
                                {replay.mapName}
                            </Typography>
                            <div className={styles.meta}>
                                {meta.map(({ icon, label }) => (
                                    <Typography
                                        key={label}
                                        size="xs"
                                        noWrap
                                        className={styles.chip}
                                    >
                                        {icon}
                                        {label}
                                    </Typography>
                                ))}
                            </div>
                        </div>
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
                        <div className={styles.stats}>
                            {stats.map(({ label, value }) => (
                                <div key={label} className={styles.stat}>
                                    <Typography
                                        size="xs"
                                        variant="secondary"
                                        uppercase
                                        noWrap
                                        className={styles.statLabel}
                                    >
                                        {label}
                                    </Typography>
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
