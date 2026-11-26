import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Gauge } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { profileScoreQuery } from "@/api/queries";
import type { ScoreScope } from "@/api/stats";
import { useLastShownScore } from "@/hooks/useLastShownScore";
import {
    Card,
    CardHeader,
    Collapse,
    ErrorMessage,
    Typography,
    rollingChunks,
} from "@/ui";
import { ScoreHistoryPanel } from "../score-history";
import { Ladder } from "./ladder";
import { Method } from "./method";
import { Parts, PartsEmpty } from "./parts";
import { ScoreRing } from "./ring";
import { BodySkeleton } from "./skeleton";
import { type ScoreTier, TIERS, tierProgress } from "./tiers";

import styles from "./styles.module.css";

export interface ScoreCardProps {
    scope: ScoreScope;
}

export function ScoreCard({ scope }: ScoreCardProps) {
    const t = useTranslations("profile.score");
    const [announcement, setAnnouncement] = useState("");
    const overview = useRef<HTMLDivElement>(null);
    const historyId = useId();
    const [historyOpen, setHistoryOpen] = useState(false);
    const { data, error } = useQuery(profileScoreQuery(scope));
    const [from, remember] = useLastShownScore(data?.scope);
    const [settled, setSettled] = useState<{
        scope: ScoreScope;
        score: number;
    } | null>(null);
    const shown =
        settled && settled.scope === data?.scope ? settled.score : from;

    const settle = (score: number) => {
        if (!data) return;

        const { scope } = data;
        setSettled((prev) =>
            prev?.scope === scope && prev.score === score
                ? prev
                : { scope, score },
        );
    };

    const onShown = (score: number) => {
        remember(score);
        settle(score);
    };

    // The rows' points follow the ring's as it moves to a new score.
    const onFrame = (points: number[]) => {
        data?.pillars.forEach((pillar, index) => {
            const text = overview.current?.querySelector(
                `[data-pillar="${pillar.id}"] [data-points]`,
            )?.firstChild;

            if (text) text.nodeValue = `${Math.round(points[index])}`;
        });
    };

    const onRankChange = (up: boolean, tier: ScoreTier) => {
        setAnnouncement(
            t(up ? "rankUp" : "rankDown", { rank: t(`tier.${tier}`) }),
        );

        // The ring holds on the cut: a rank up stands on it, a rank down just under.
        const index = TIERS.findIndex((step) => step.tier === tier);
        settle(up ? TIERS[index].from : TIERS[index + 1].from - 1);
    };

    const onHistoryToggle = () => setHistoryOpen((open) => !open);

    const unrated = (score: NonNullable<typeof data>) =>
        score.eligibleGames < score.minGames
            ? t(`unrated.${score.scope}`, {
                  count: score.minGames - score.eligibleGames,
              })
            : t("unrated.thin");

    const progress = (score: number) => {
        const { next } = tierProgress(score);

        return next
            ? t("progress", {
                  toNext: next.points,
                  next: t(`tier.${next.tier}`),
              })
            : t("progressTop");
    };

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={Gauge}
                title={t("title")}
                subtitle={
                    data && data.career !== null
                        ? t.rich("subtitle", {
                              games: data.careerGames,
                              pool: data.baselinePlayers,
                              num: rollingChunks,
                          })
                        : t("subtitleEmpty")
                }
            />
            {error && <ErrorMessage error={error} />}
            {!data ? (
                !error && <BodySkeleton />
            ) : data.career === null ? (
                <div className={styles.body}>
                    <div className={styles.overview}>
                        <div className={styles.rating}>
                            <ScoreRing
                                value={null}
                                pillars={data.pillars}
                                label={t("notEnough")}
                            />
                            <div className={styles.caption}>
                                <Typography size="sm" variant="tertiary">
                                    {unrated(data)}
                                </Typography>
                                <Method
                                    scope={data.scope}
                                    score={null}
                                    maxes={data.pillarMaxes}
                                />
                            </div>
                        </div>
                        <PartsEmpty className={styles.parts} />
                    </div>
                    <Ladder score={null} />
                </div>
            ) : (
                <>
                    <div className={styles.body}>
                        <div ref={overview} className={styles.overview}>
                            <div className={styles.rating}>
                                <ScoreRing
                                    key={data.scope}
                                    value={data.career}
                                    pillars={data.pillars}
                                    from={from}
                                    onFrame={onFrame}
                                    onRankChange={onRankChange}
                                    onShown={onShown}
                                    label={t("label", {
                                        score: data.career,
                                        rank: t(
                                            `tier.${tierProgress(data.career).tier}`,
                                        ),
                                        progress: progress(data.career),
                                    })}
                                />
                                <div className={styles.caption}>
                                    <Typography size="sm" variant="tertiary">
                                        {progress(shown ?? data.career)}
                                    </Typography>
                                    <Method
                                        scope={data.scope}
                                        score={data.career}
                                        maxes={data.pillarMaxes}
                                    />
                                </div>
                                <span
                                    aria-live="polite"
                                    className={styles.live}
                                >
                                    {announcement}
                                </span>
                            </div>
                            <Parts
                                key={data.scope}
                                pillars={data.pillars}
                                className={styles.parts}
                            />
                        </div>
                        <Ladder key={data.scope} score={shown ?? data.career} />
                    </div>
                    <button
                        type="button"
                        aria-expanded={historyOpen}
                        aria-controls={historyId}
                        className={styles.historySummary}
                        onClick={onHistoryToggle}
                    >
                        <Typography size="sm" weight="semibold">
                            {t("history.title")}
                        </Typography>
                        <ChevronDown size={16} className={styles.chevron} />
                    </button>
                    <Collapse open={historyOpen} lazy>
                        <div id={historyId} className={styles.historyBody}>
                            <ScoreHistoryPanel
                                points={data.history}
                                subtitle={t("history.subtitle", {
                                    window: data.window,
                                })}
                            />
                        </div>
                    </Collapse>
                </>
            )}
        </Card>
    );
}
