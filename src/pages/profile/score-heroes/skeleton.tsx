import { ChartScatter } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardHeader, Skeleton } from "@/ui";
import {
    MIN_GAMES,
    MIN_HEIGHT,
    PITCH,
    type Swarmed,
    axis,
    position,
    swarm,
} from "./swarm";
import { TierBars } from "./tier-bars";
import { usePlotWidth } from "./use-plot-width";

import styles from "./styles.module.css";

// A stand-in hero pool: most scores near the middle, a third played enough for a big dot.
const SCORES = [
    50, 53, 47, 56, 44, 51, 59, 42, 49, 54, 46, 52, 57, 48, 61, 39, 51, 45, 55,
    50, 64, 43, 53, 48, 58, 36, 67, 52,
];

const GHOSTS: Swarmed[] = SCORES.map((score, index) => ({
    name: `${index}`,
    score,
    games: index % 3 === 0 ? MIN_GAMES : 1,
}));

const ENDS = axis(SCORES);

export function HeroesSkeleton() {
    const t = useTranslations("profile.score.heroes");
    const { ref: plot, width } = usePlotWidth();

    const x = (score: number) => position(score, width, ENDS);
    const { placed } = swarm(GHOSTS, width, x);

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={ChartScatter}
                title={t("title")}
                subtitle={<Skeleton className={styles.subtitleBar} />}
            />
            <div className={styles.body}>
                <div
                    ref={plot}
                    className={styles.plot}
                    style={{ height: MIN_HEIGHT }}
                >
                    {width > 0 &&
                        placed.map(({ hero, left, row, size }) => (
                            <Skeleton
                                key={hero.name}
                                className={styles.ghostDot}
                                style={{
                                    left,
                                    bottom: row * PITCH + (PITCH - size) / 2,
                                    width: size,
                                    height: size,
                                }}
                            />
                        ))}
                </div>
                <TierBars />
            </div>
        </Card>
    );
}
