import type { XpBreakdown } from "@/api/replays";

export const SOURCES = [
    "hero",
    "structure",
    "creep",
    "minion",
] as const satisfies (keyof XpBreakdown)[];

export type Source = (typeof SOURCES)[number];

export type FormatXp = (value: number, signed?: boolean) => string;

export type Leader = "ally" | "enemy" | null;

export const lead = (
    ally: number,
    enemy: number,
    formatXp: FormatXp,
): Leader => {
    if (formatXp(ally) === formatXp(enemy)) return null;
    return ally > enemy ? "ally" : "enemy";
};
