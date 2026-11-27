import { useQuery } from "@tanstack/react-query";
import classNames from "classnames";
import {
    Award,
    Crown,
    Flame,
    Gamepad2,
    Timer,
    TrendingDown,
    Trophy,
} from "lucide-react";
import { type MouseEvent, type ReactNode, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";

import {
    profileScoreQuery,
    sessionBestsQuery,
    sessionRecordQuery,
} from "@/api/queries";
import { SessionDelta } from "@/components";
import { useBestTiles } from "@/hooks/useBestTiles";
import { GemIcon } from "@/pages/profile/score-card/gem";
import {
    TIERS,
    rankTone,
    tierIndex,
    tierProgress,
} from "@/pages/profile/score-card/tiers";
import {
    Card,
    CardHeader,
    ChipButton,
    ChipGroup,
    EmptyState,
    ErrorMessage,
    Eyebrow,
    Skeleton,
    StatTile,
    Typography,
    WinRate,
    rollingChunks,
} from "@/ui";
import { TIME_FORMAT } from "@/utils/dates";
import {
    averageScore,
    isJudged,
    resultStreak,
    sessionRateChange,
    winRate,
} from "@/utils/hero-stats";
import { BestRow } from "./best-row";
import { HeroTile } from "./hero-tile";

import styles from "./styles.module.css";

type ListTab = "heroes" | "bests";

const win = (chunks: ReactNode) => <span className={styles.win}>{chunks}</span>;

const loss = (chunks: ReactNode) => (
    <span className={styles.loss}>{chunks}</span>
);

export function SessionCard() {
    const t = useTranslations("home.session");
    const career = useTranslations("career");
    const scoreT = useTranslations("profile.score");
    const format = useFormatter();
    const { data, error } = useQuery(sessionRecordQuery);
    const { data: score } = useQuery(profileScoreQuery("all"));
    const { data: sessionBests } = useQuery(sessionBestsQuery);
    const { fromSessionBest } = useBestTiles();
    const [tab, setTab] = useState<ListTab>("heroes");

    const onTabClick = (e: MouseEvent<HTMLButtonElement>) =>
        setTab(e.currentTarget.value as ListTab);

    const since = data && format.dateTime(new Date(data.started), TIME_FORMAT);
    const played = !!data && data.games.length > 0;

    const scoring = !score;

    // Holds the subtitle's line until the start time is in, so the header doesn't jump.
    const subtitle = !data
        ? " "
        : played
          ? t("subtitle", {
                games: data.games.length,
                hours: Math.floor(data.duration / 3600),
                minutes: Math.floor((data.duration % 3600) / 60),
            })
          : t("since", { time: since ?? "" });

    const change = (
        value: number | null | undefined,
        unit: "percent" | "points",
    ) =>
        value ? (
            <SessionDelta value={value} unit={unit} />
        ) : (
            <Typography as="span" size="sm" variant="tertiary">
                {t("noChange")}
            </Typography>
        );

    const rated = score?.career ?? null;
    const tier = rated !== null ? tierProgress(rated).tier : null;
    const tone =
        rated !== null ? rankTone(TIERS[tierIndex(rated)].rank) : undefined;

    const streak = data ? resultStreak(data.games) : null;
    const mvps = data?.games.filter((game) => game.mvp).length ?? 0;

    const scored = score?.sessionGames.length ?? 0;
    const average = score ? averageScore(score.sessionGames) : null;
    const averageTone =
        average !== null ? rankTone(TIERS[tierIndex(average)].rank) : undefined;

    const games = data?.games.length ?? 0;
    const averageDetail =
        average === null
            ? null
            : scored < games
              ? t("avgPartial", { scored, games })
              : rated !== null
                ? t("careerScore", { score: rated })
                : null;

    const beaten = sessionBests ?? [];

    // A career best run still going shows on the streak tile instead of in the list.
    const lastDecided = data?.games.find((game) => game.win !== null);
    const runningBest = streak?.win
        ? beaten.find(
              (best) =>
                  best.career &&
                  best.metric === "winStreak" &&
                  best.replayId === lastDecided?.replayId,
          )
        : undefined;
    const streakBest = runningBest && fromSessionBest(runningBest);

    const bests = beaten
        .filter((best) => best !== runningBest)
        .map(fromSessionBest)
        .sort((a, b) => Number(b.career) - Number(a.career));

    // Falls back to the heroes once no best is left to show.
    const shownTab = bests.length > 0 ? tab : "heroes";

    const record = played && (
        <Typography as="p" display mono className={styles.record}>
            {career.rich("record", {
                wins: data.wins,
                losses: data.losses,
                num: rollingChunks,
                win,
                loss,
            })}
        </Typography>
    );

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={Timer}
                size="sm"
                title={t("title")}
                subtitle={subtitle}
                action={record}
            />
            {error && <ErrorMessage error={error} />}
            {!error && !played && (
                <EmptyState icon={Gamepad2} title={t("empty.title")}>
                    {t("empty.body")}
                </EmptyState>
            )}
            {data && played && (
                <div className={styles.body}>
                    <section className={styles.section}>
                        <Eyebrow>{t("career")}</Eyebrow>
                        <div className={styles.career}>
                            <StatTile
                                variant="panel"
                                icon={Trophy}
                                label={t("winRate")}
                                value={
                                    <span className={styles.valueRow}>
                                        <WinRate
                                            rate={winRate(
                                                data.careerWins,
                                                data.careerLosses,
                                            )}
                                            judged={isJudged(
                                                data.careerWins,
                                                data.careerLosses,
                                            )}
                                        />
                                        {change(
                                            sessionRateChange(
                                                data.careerWins,
                                                data.careerLosses,
                                                data.careerSessionWins,
                                                data.careerSessionLosses,
                                            ),
                                            "percent",
                                        )}
                                    </span>
                                }
                                detail={career.rich("record", {
                                    wins: data.careerWins,
                                    losses: data.careerLosses,
                                    num: rollingChunks,
                                    win,
                                    loss,
                                })}
                            />

                            <StatTile
                                variant="panel"
                                icon={GemIcon}
                                label={t("heroScore")}
                                accent={tone ? "tone" : undefined}
                                className={styles.score}
                                style={tone}
                                value={
                                    scoring ? (
                                        <Skeleton className={styles.valueBar} />
                                    ) : rated === null ? (
                                        "-"
                                    ) : (
                                        <span className={styles.valueRow}>
                                            {rated}
                                            {!!score?.sessionChange && (
                                                <SessionDelta
                                                    value={score.sessionChange}
                                                    unit="points"
                                                />
                                            )}
                                        </span>
                                    )
                                }
                                detail={
                                    scoring ? (
                                        <Skeleton
                                            className={styles.detailBar}
                                        />
                                    ) : tier ? (
                                        scoreT(`tier.${tier}`)
                                    ) : (
                                        scoreT("notEnough")
                                    )
                                }
                            />
                        </div>
                    </section>

                    <section className={styles.section}>
                        <Eyebrow>{t("thisSession")}</Eyebrow>
                        <div className={styles.session}>
                            <StatTile
                                variant="panel"
                                icon={
                                    streak?.win === false ? TrendingDown : Flame
                                }
                                label={
                                    streak?.win === false
                                        ? t("lossStreak")
                                        : t("winStreak")
                                }
                                accent={streak ? "tone" : undefined}
                                className={
                                    !streak
                                        ? undefined
                                        : streak.win
                                          ? styles.winTone
                                          : styles.lossTone
                                }
                                value={
                                    streakBest?.value ?? streak?.length ?? "-"
                                }
                                detail={
                                    streakBest?.detail ??
                                    (streak && t("inARow"))
                                }
                            />

                            <StatTile
                                variant="panel"
                                icon={Award}
                                label={t("mvps")}
                                accent={mvps > 0 ? "mvp" : undefined}
                                value={mvps}
                                detail={t("mvpDetail", {
                                    games: data.games.length,
                                })}
                            />

                            <StatTile
                                variant="panel"
                                icon={GemIcon}
                                label={t("avgScore")}
                                accent={averageTone ? "tone" : undefined}
                                className={styles.score}
                                style={averageTone}
                                value={
                                    scoring ? (
                                        <Skeleton className={styles.valueBar} />
                                    ) : (
                                        (average ?? "-")
                                    )
                                }
                                detail={
                                    scoring ? (
                                        <Skeleton
                                            className={styles.detailBar}
                                        />
                                    ) : (
                                        averageDetail
                                    )
                                }
                            />
                        </div>
                    </section>

                    <section
                        className={classNames(styles.section, styles.heroes)}
                    >
                        {bests.length > 0 ? (
                            <div className={styles.tabs}>
                                <ChipGroup label={t("lists")}>
                                    <ChipButton
                                        value="heroes"
                                        icon={<Crown />}
                                        count={data.heroes.length}
                                        pressed={shownTab === "heroes"}
                                        onClick={onTabClick}
                                    >
                                        {t("heroes")}
                                    </ChipButton>
                                    <ChipButton
                                        value="bests"
                                        icon={<Trophy />}
                                        count={bests.length}
                                        pressed={shownTab === "bests"}
                                        onClick={onTabClick}
                                    >
                                        {t("newBests")}
                                    </ChipButton>
                                </ChipGroup>
                            </div>
                        ) : (
                            <Eyebrow>{t("heroes")}</Eyebrow>
                        )}
                        {shownTab === "bests" ? (
                            <ul className={styles.tiles}>
                                {bests.map((best) => (
                                    <BestRow
                                        key={best.key}
                                        best={best}
                                        portrait={
                                            data.heroes.find(
                                                (hero) =>
                                                    hero.heroId === best.heroId,
                                            )?.portrait ?? null
                                        }
                                    />
                                ))}
                            </ul>
                        ) : (
                            <ul className={styles.tiles}>
                                {data.heroes.map((hero) => (
                                    <HeroTile
                                        key={hero.heroId}
                                        hero={hero}
                                        scoring={scoring}
                                        score={score?.heroes.find(
                                            (row) => row.heroId === hero.heroId,
                                        )}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </Card>
    );
}
