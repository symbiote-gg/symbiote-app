import classNames from "classnames";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";
import { useParams } from "wouter";

import { BackLink, Page } from "@/components";
import { useHeroDetail } from "@/hooks/useHeroDetail";
import { EmptyState, ErrorMessage } from "@/ui";
import { Awards } from "./awards";
import { Bests } from "./bests";
import { BestsSkeleton } from "./bests/skeleton";
import { Career } from "./career";
import { CareerSkeleton } from "./career/skeleton";
import { GameLength } from "./game-length";
import { Games } from "./games";
import { GamesSkeleton } from "./games/skeleton";
import { Maps } from "./maps";
import { Talents } from "./talents";
import { TeamShare } from "./team-share";
import { Trend } from "./trend";
import { TrendSkeleton } from "./trend/skeleton";

import styles from "./styles.module.css";

export function HeroDetail() {
    const t = useTranslations("hero");
    const { heroId } = useParams<{ heroId: string }>();
    const { data: hero, error } = useHeroDetail(Number(heroId));
    const loading = hero === undefined && !error;

    const accent = hero?.accent
        ? ({ "--hero-accent": hero.accent } as CSSProperties)
        : undefined;

    const games = hero?.bestGame || hero?.lastGame;

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
                        <CareerSkeleton />
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
                {hero && <Career hero={hero} />}
                {hero?.games === 0 && (
                    <EmptyState>{t("noGames", { hero: hero.name })}</EmptyState>
                )}
                {!!hero?.games && (
                    <div className={styles.grid}>
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
