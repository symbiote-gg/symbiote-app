import classNames from "classnames";
import type { CSSProperties } from "react";
import { useTranslations } from "use-intl";
import { useParams } from "wouter";

import { BackLink, Page } from "@/components";
import { useHeroDetail } from "@/hooks/useHeroDetail";
import { EmptyState, ErrorMessage } from "@/ui";
import { Awards } from "./awards";
import { Bests } from "./bests";
import { GameLength } from "./game-length";
import { Games } from "./games";
import { Header } from "./header";
import { Maps } from "./maps";
import { PerGame } from "./per-game";
import { Talents } from "./talents";
import { Trend } from "./trend";

import styles from "./styles.module.css";

export function HeroDetail() {
    const t = useTranslations("hero");
    const { heroId } = useParams<{ heroId: string }>();
    const { data: hero, error } = useHeroDetail(Number(heroId));

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
                {hero && <Header hero={hero} />}
                {hero?.games === 0 && (
                    <EmptyState>{t("noGames", { hero: hero.name })}</EmptyState>
                )}
                {!!hero?.games && (
                    <div className={styles.grid}>
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
                        <div className={styles.perGame}>
                            <PerGame hero={hero} />
                        </div>
                        <div className={styles.maps}>
                            <Maps maps={hero.maps} />
                        </div>
                        <div className={styles.gameLength}>
                            <GameLength lengths={hero.lengths} />
                        </div>
                        <div className={styles.awards}>
                            <Awards awards={hero.awards} games={hero.games} />
                        </div>
                        <div className={styles.bests}>
                            <Bests hero={hero.name} bests={hero.bests} />
                        </div>
                    </div>
                )}
            </div>
        </Page>
    );
}
