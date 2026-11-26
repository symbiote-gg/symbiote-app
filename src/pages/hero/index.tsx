import { useQuery } from "@tanstack/react-query";
import classNames from "classnames";
import { SearchX, ShieldUser } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { useTranslations } from "use-intl";
import { useParams } from "wouter";

import { heroDetailQuery } from "@/api/queries";
import type { ScoreScope } from "@/api/stats";
import { BackLink, Page } from "@/components";
import { Button, Card, EmptyState, ErrorMessage } from "@/ui";
import { Awards } from "./awards";
import { Bests } from "./bests";
import { BestsSkeleton } from "./bests/skeleton";
import { Career } from "./career";
import { CareerSkeleton } from "./career/skeleton";
import { GameLength } from "./game-length";
import { Games } from "./games";
import { GamesSkeleton } from "./games/skeleton";
import { Maps } from "./maps";
import { HeroScoreHistory } from "./score-history";
import { Talents } from "./talents";
import { TeamShare } from "./team-share";
import { Trend } from "./trend";
import { TrendSkeleton } from "./trend/skeleton";

import styles from "./styles.module.css";

export function HeroDetail() {
    const t = useTranslations("hero");
    const scopes = useTranslations("profile.scope");
    const { heroId } = useParams<{ heroId: string }>();
    const [scope, setScope] = useState<ScoreScope>("all");

    // Another hero starts back on all modes, the scope prefetched on hover.
    const [scopedHero, setScopedHero] = useState(heroId);
    if (scopedHero !== heroId) {
        setScopedHero(heroId);
        setScope("all");
    }

    const {
        data: hero,
        error,
        isPlaceholderData,
    } = useQuery(heroDetailQuery(Number(heroId), scope));
    const loading = hero === undefined && !error;

    const accent = hero?.accent
        ? ({ "--hero-accent": hero.accent } as CSSProperties)
        : undefined;

    const games = hero?.bestGame || hero?.lastGame;

    const onShowAll = () => setScope("all");

    return (
        <Page>
            <div className={styles.main} style={accent}>
                {(error || hero === null) && (
                    <BackLink href="/heroes" label={t("back")} />
                )}
                {error && <ErrorMessage error={error} />}
                {hero === null && <EmptyState>{t("notFound")}</EmptyState>}
                {loading && (
                    <>
                        <CareerSkeleton
                            scope={scope}
                            onScopeChange={setScope}
                        />
                        <div className={styles.grid}>
                            <div className={styles.bests}>
                                <BestsSkeleton />
                            </div>
                            <div
                                className={classNames(
                                    styles.trend,
                                    styles.beside,
                                )}
                            >
                                <TrendSkeleton />
                            </div>
                            <div className={styles.games}>
                                <GamesSkeleton />
                            </div>
                        </div>
                    </>
                )}
                {hero && (
                    <Career
                        hero={hero}
                        scope={scope}
                        stale={isPlaceholderData}
                        onScopeChange={setScope}
                    />
                )}
                {hero?.games === 0 && scope === "all" && (
                    <Card>
                        <EmptyState
                            icon={ShieldUser}
                            title={t("noGames.title", { hero: hero.name })}
                        >
                            {t("noGames.body")}
                        </EmptyState>
                    </Card>
                )}
                {hero?.games === 0 && scope !== "all" && (
                    <Card>
                        <EmptyState
                            icon={SearchX}
                            title={t("noScopeGames.title", {
                                hero: hero.name,
                                mode: scopes(scope),
                            })}
                            action={
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onShowAll}
                                >
                                    {t("noScopeGames.showAll")}
                                </Button>
                            }
                        >
                            {t("noScopeGames.body")}
                        </EmptyState>
                    </Card>
                )}
                {!!hero?.games && (
                    <div className={styles.grid} aria-busy={isPlaceholderData}>
                        <div className={styles.bests}>
                            <Bests hero={hero} />
                        </div>
                        <div
                            className={classNames(styles.trend, {
                                [styles.beside]: games,
                            })}
                        >
                            <Trend hero={hero.name} trend={hero.trend} />
                        </div>
                        {games && (
                            <div className={styles.games}>
                                <Games hero={hero} />
                            </div>
                        )}
                        <div className={styles.scoreHistory}>
                            <HeroScoreHistory
                                heroId={hero.heroId}
                                hero={hero.name}
                                scope={scope}
                            />
                        </div>
                        <div className={styles.talents}>
                            <Talents talents={hero.talents} />
                        </div>
                        <div className={styles.maps}>
                            <Maps maps={hero.maps} />
                        </div>
                        <div className={styles.teamShare}>
                            <TeamShare hero={hero} />
                        </div>
                        <div className={styles.gameLength}>
                            <GameLength lengths={hero.lengths} />
                        </div>
                        <div className={styles.awards}>
                            <Awards
                                hero={hero.name}
                                awards={hero.awards}
                                games={hero.games}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Page>
    );
}
