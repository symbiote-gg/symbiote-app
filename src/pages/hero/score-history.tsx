import { useTranslations } from "use-intl";

import { useProfileScore } from "@/hooks/useProfileScore";
import { ScoreHistoryCard } from "@/pages/profile/score-history";
import { ErrorMessage } from "@/ui";

export interface HeroScoreHistoryProps {
    heroId: number;
    hero: string;
}

export function HeroScoreHistory({ heroId, hero }: HeroScoreHistoryProps) {
    const t = useTranslations("hero.scoreHistory");
    const { data, error } = useProfileScore("all");

    if (error) return <ErrorMessage error={error} />;

    // No skeleton: most heroes have too few games for a history, and a
    // placeholder that then vanishes would shift the grid.
    const row = data?.heroes.find((entry) => entry.heroId === heroId);
    if (!data || !row || row.history.length === 0) return null;

    return (
        <ScoreHistoryCard
            points={row.history}
            score={row.history[row.history.length - 1].score}
            games={Math.min(row.games, data.window)}
            subtitle={t("subtitle", { hero, window: data.window })}
        />
    );
}
