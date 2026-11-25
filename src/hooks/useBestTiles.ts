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
import type { BestMetric, SessionBest } from "@/api/stats";
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

const BEST_TONES: Record<BestMetric, string> = {
    heroDamage: "var(--color-part-fighting)",
    takedowns: "var(--color-part-fighting)",
    damageTaken: "var(--color-part-survival)",
    fewestDeathsWin: "var(--color-part-survival)",
    healing: "var(--color-part-team-role)",
    xp: "var(--color-part-map)",
    siegeDamage: "var(--color-part-map)",
    fastestWin: "var(--color-brand-orange)",
    winStreak: "var(--color-win)",
};

const CAREER_TONE = "var(--color-mvp)";

const COUNTS: GameBest[] = ["takedowns", "fewestDeathsWin"];

export type SessionBestTile = BestTile & {
    career: boolean;
    heroId: number;
    hero: string;
    previous: string;
    gain: string;
    tone: string;
};

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

    const valueOf = (key: GameBest | "winStreak", value: number) => {
        if (key === "fastestWin") return formatDuration(value);
        if (key === "winStreak") return count(value);

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

    const fromSessionBest = (best: SessionBest): SessionBestTile => {
        const previous = valueOf(best.metric, best.previous);
        const change = best.value - best.previous;
        const gain = `${change < 0 ? "-" : "+"}${valueOf(best.metric, Math.abs(change))}`;

        return {
            key: `${best.career ? "career" : best.heroId}-${best.metric}`,
            label: t(best.metric),
            value: valueOf(best.metric, best.value),
            detail: t(best.career ? "session.careerWas" : "session.heroWas", {
                previous,
            }),
            icon: best.metric === "winStreak" ? Flame : BEST_ICONS[best.metric],
            replayId: best.replayId,
            career: best.career,
            heroId: best.heroId,
            hero: best.hero,
            previous,
            gain,
            tone: best.career ? CAREER_TONE : BEST_TONES[best.metric],
        };
    };

    return { fromGame, fromStreak, fromSessionBest };
}
