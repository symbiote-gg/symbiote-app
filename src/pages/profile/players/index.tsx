import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useTranslations } from "use-intl";

import { teammatesQuery } from "@/api/queries";
import type { ScoreScope, Teammate } from "@/api/stats";
import { Card, CardHeader } from "@/ui";
import { winRate } from "@/utils/hero-stats";
import { PlayerTile } from "./player-tile";
import { PlayerTileSkeleton } from "./player-tile/skeleton";

import styles from "./styles.module.css";

const SKELETON_TILES = [0, 1, 2];

// Below this a high win rate could be a short streak rather than a duo that works.
const MIN_TAG_GAMES = 20;

/** The teammate with the best winning record together, more games breaking ties. */
function bestDuo(mates: Teammate[]) {
    let best: { id: number; rate: number; games: number } | null = null;

    for (const mate of mates) {
        const rate = winRate(mate.wins, mate.losses);
        if (mate.games < MIN_TAG_GAMES || rate === null || rate < 0.5) continue;

        const better =
            !best ||
            rate > best.rate ||
            (rate === best.rate && mate.games > best.games);
        if (better) best = { id: mate.playerId, rate, games: mate.games };
    }

    return best?.id ?? null;
}

export interface PlayersProps {
    scope: ScoreScope;
}

export function Players({ scope }: PlayersProps) {
    const t = useTranslations("profile.players");
    const { data: mates, error } = useQuery(teammatesQuery(scope));

    const header = (
        <CardHeader
            size="sm"
            icon={Users}
            title={t("title")}
            subtitle={t("subtitle")}
        />
    );

    if (error) return null;

    if (!mates) {
        return (
            <Card className={styles.root}>
                {header}
                <ul className={styles.tiles}>
                    {SKELETON_TILES.map((tile) => (
                        <PlayerTileSkeleton key={tile} />
                    ))}
                </ul>
            </Card>
        );
    }

    if (mates.length === 0) return null;

    const duo = bestDuo(mates);

    return (
        <Card className={styles.root}>
            {header}
            <ul className={styles.tiles}>
                {mates.map((mate) => (
                    <PlayerTile
                        key={mate.playerId}
                        mate={mate}
                        bestDuo={mate.playerId === duo}
                    />
                ))}
            </ul>
        </Card>
    );
}
