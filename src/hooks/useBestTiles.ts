import {
    Castle,
    Flame,
    HeartPlus,
    type LucideIcon,
    Shield,
    Star,
    Swords,
    Target,
    Timer,
    Tombstone,
} from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroBest, WinStreak } from "@/api/heroes";
import type { BestTile } from "@/components/best-tiles";
import { formatDuration, usePlayedDay } from "@/utils/dates";

export type GameBest =
    | "heroDamage"
    | "siegeDamage"
    | "healing"
    | "damageTaken"
    | "xp"
    | "takedowns"
    | "fastestWin"
    | "fewestDeathsWin";

const BEST_ICONS: Record<GameBest, LucideIcon> = {
    heroDamage: Target,
    siegeDamage: Castle,
    healing: HeartPlus,
    damageTaken: Shield,
    xp: Star,
    takedowns: Swords,
    fewestDeathsWin: Tombstone,
    fastestWin: Timer,
};

const COUNTS: GameBest[] = ["takedowns", "fewestDeathsWin"];

export function useBestTiles() {
    const t = useTranslations("bests");
    const format = useFormatter();
    const playedDay = usePlayedDay();

    const count = (value: number) => format.number(value);
    const amount = (value: number) =>
        format.number(value, {
            notation: "compact",
            maximumSignificantDigits: 3,
        });

    const valueOf = (key: GameBest, value: number) => {
        if (key === "fastestWin") return formatDuration(value);

        return COUNTS.includes(key) ? count(value) : amount(value);
    };

    const fromGame = (
        key: GameBest,
        best: HeroBest | null,
    ): BestTile | null => {
        if (!best) return null;

        const date = playedDay(best.timestamp);

        return {
            key,
            label: t(key),
            value: valueOf(key, best.value),
            detail: best.hero
                ? t("heroMeta", { hero: best.hero, map: best.map, date })
                : t("meta", { map: best.map, date }),
            icon: BEST_ICONS[key],
            replayId: best.replayId,
        };
    };

    const fromStreak = (streak: WinStreak | null): BestTile | null =>
        streak && {
            key: "winStreak",
            label: t("winStreak"),
            value: count(streak.games),
            detail: t("streak", { date: playedDay(streak.ended) }),
            icon: Flame,
        };

    return { fromGame, fromStreak };
}
