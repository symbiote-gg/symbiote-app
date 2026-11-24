import { Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import type { ScoreScope } from "@/api/stats";
import { BestTiles, BestTilesSkeleton } from "@/components";
import { useBestTiles } from "@/hooks/useBestTiles";
import { useProfileBests } from "@/hooks/useProfileBests";
import { Card, CardHeader } from "@/ui";

const TILES = 6;

export interface ProfileBestsProps {
    scope: ScoreScope;
}

export function ProfileBests({ scope }: ProfileBestsProps) {
    const t = useTranslations("profile.bests");
    const { fromGame, fromStreak } = useBestTiles();
    const { data: bests, error } = useProfileBests(scope);

    if (error) return null;

    const header = (
        <CardHeader
            size="sm"
            icon={Trophy}
            title={t("title")}
            subtitle={t("subtitle")}
        />
    );

    if (!bests) {
        return (
            <Card>
                {header}
                <BestTilesSkeleton count={TILES} />
            </Card>
        );
    }

    const tiles = [
        fromGame("heroDamage", bests.heroDamage),
        fromGame("siegeDamage", bests.siegeDamage),
        fromGame("healing", bests.healing),
        fromStreak(bests.winStreak),
        fromGame("fastestWin", bests.fastestWin),
        fromGame("takedowns", bests.takedowns),
    ].filter((tile) => tile !== null);

    if (tiles.length === 0) return null;

    return (
        <Card>
            {header}
            <BestTiles tiles={tiles} />
        </Card>
    );
}
