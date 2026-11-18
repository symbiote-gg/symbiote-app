import { ChartScatter } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroScoreRow, ScoreScope } from "@/api/stats";
import { useProfileScore } from "@/hooks/useProfileScore";
import { Card, CardHeader, ErrorMessage } from "@/ui";
import { Dots } from "./dots";
import { HeroesSkeleton } from "./skeleton";
import {
    MIN_GAMES,
    MIN_HEIGHT,
    PITCH,
    axis,
    isMain,
    position,
    swarm,
} from "./swarm";
import { TierBars } from "./tier-bars";
import { usePlotWidth } from "./use-plot-width";

import styles from "./styles.module.css";

export interface ScoreHeroesProps {
    scope: ScoreScope;
}

export function ScoreHeroes({ scope }: ScoreHeroesProps) {
    const { data, error } = useProfileScore(scope);

    if (error) return <ErrorMessage error={error} />;
    if (!data) return <HeroesSkeleton />;
    if (data.career === null || data.heroes.length === 0) return null;

    return <Heroes heroes={data.heroes} />;
}

interface HeroesProps {
    heroes: HeroScoreRow[];
}

function Heroes({ heroes }: HeroesProps) {
    const t = useTranslations("profile.score.heroes");
    const { ref: plot, width } = usePlotWidth();

    const ends = axis(heroes.map((hero) => hero.score));
    const x = (score: number) => position(score, width, ends);

    const { placed, rows } = swarm(heroes, width, x);

    const few = heroes.filter((hero) => !isMain(hero)).length;

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartScatter}
                title={t("title")}
                subtitle={t("subtitle", {
                    count: heroes.length,
                    few,
                    min: MIN_GAMES,
                })}
            />
            <div className={styles.body}>
                <div
                    ref={plot}
                    className={styles.plot}
                    style={{ height: Math.max(rows * PITCH, MIN_HEIGHT) }}
                >
                    {width > 0 && <Dots dots={placed} />}
                </div>
                <TierBars />
            </div>
        </Card>
    );
}
