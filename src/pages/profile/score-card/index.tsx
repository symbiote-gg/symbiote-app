import { Gamepad2, Gauge, Users } from "lucide-react";
import { useRef, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { ScorePillarId, ScoreScope } from "@/api/stats";
import { useLastShownScore } from "@/hooks/useLastShownScore";
import { useProfileScore } from "@/hooks/useProfileScore";
import {
    Card,
    CardHeader,
    ErrorMessage,
    Select,
    StatTile,
    Typography,
} from "@/ui";
import { HeroTiers } from "./heroes";
import { History } from "./history";
import { Ladder } from "./ladder";
import { Method } from "./method";
import { Parts } from "./parts";
import { ScoreRing } from "./ring";
import { BodySkeleton } from "./skeleton";
import { Spread, SpreadLegend } from "./spread";
import { type ScoreTier, TIERS, tierProgress } from "./tiers";

import styles from "./styles.module.css";

type ModeScope = Exclude<ScoreScope, "all">;

const SCOPES: readonly ModeScope[] = ["draft", "quickMatch"];

// The rest stand right of the ring. A part without a weighted stat isn't sent.
const LEFT_PILLARS: readonly ScorePillarId[] = ["fighting", "survival"];

export function ScoreCard() {
    const t = useTranslations("profile.score");
    const format = useFormatter();
    const [scope, setScope] = useState<ScoreScope>("all");
    const [announcement, setAnnouncement] = useState("");
    const overview = useRef<HTMLDivElement>(null);
    const { data, error } = useProfileScore(scope);
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

    const onScope = (value: ModeScope | null) => setScope(value ?? "all");

    const scopes = SCOPES.map((value) => ({
        value,
        label: t(`scope.${value}`),
    }));

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
                icon={Gauge}
                title={t("title")}
                addon={
                    <Method
                        scope={data?.scope ?? scope}
                        recent={data?.window}
                    />
                }
                subtitle={t("subtitle")}
                action={
                    <Select
                        icon={<Gamepad2 />}
                        label={t("scope.label")}
                        options={scopes}
                        value={scope === "all" ? null : scope}
                        emptyLabel={t("scope.all")}
                        clearLabel={t("scope.clear")}
                        onChange={onScope}
                    />
                }
            />
            {error && <ErrorMessage error={error} />}
            {!data ? (
                !error && <BodySkeleton />
            ) : data.career === null ? (
                <div className={styles.body}>
                    <Ladder score={null} />
                    <div className={styles.unrated}>
                        <ScoreRing
                            value={null}
                            pillars={data.pillars}
                            label={t("notEnough")}
                        />
                        <Typography size="sm" variant="tertiary">
                            {unrated(data)}
                        </Typography>
                    </div>
                </div>
            ) : (
                <div className={styles.body}>
                    <Ladder score={shown ?? data.career} />
                    <div ref={overview} className={styles.overview}>
                        <div className={styles.side}>
                            <StatTile
                                variant="panel"
                                icon={Gamepad2}
                                label={t("careerGames")}
                                value={format.number(data.careerGames)}
                                detail={t("careerDetail")}
                                meta={t("spread.yours")}
                                footer={<SpreadLegend tone="single" />}
                                aside={
                                    <Spread
                                        bins={data.spread}
                                        marker={data.career}
                                        tone="single"
                                    />
                                }
                                className={styles.fact}
                            />
                            <Parts
                                pillars={data.pillars.filter((pillar) =>
                                    LEFT_PILLARS.includes(pillar.id),
                                )}
                            />
                        </div>
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
                            <Typography size="sm" variant="tertiary">
                                {progress(shown ?? data.career)}
                            </Typography>
                            <span aria-live="polite" className={styles.live}>
                                {announcement}
                            </span>
                        </div>
                        <div className={styles.side}>
                            <StatTile
                                variant="panel"
                                icon={Users}
                                label={t("pool.label")}
                                value={format.number(data.baselinePlayers)}
                                detail={t("pool.detail")}
                                meta={t("spread.theirs")}
                                footer={<SpreadLegend tone="split" />}
                                aside={
                                    <Spread
                                        bins={data.poolSpread}
                                        marker={data.career}
                                        tone="split"
                                    />
                                }
                                className={styles.fact}
                            />
                            <Parts
                                pillars={data.pillars.filter(
                                    (pillar) =>
                                        !LEFT_PILLARS.includes(pillar.id),
                                )}
                            />
                        </div>
                    </div>
                    <History
                        points={data.history}
                        score={data.score}
                        games={data.games}
                    />
                    <HeroTiers heroes={data.heroes} />
                </div>
            )}
        </Card>
    );
}
