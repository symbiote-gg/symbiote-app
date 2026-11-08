import { invoke } from "@tauri-apps/api/core";

import type { Award, HeroRole, ReplayFilters } from "./replays";

export type HeroSummary = {
    heroId: number;
    name: string;
    role: HeroRole | null;
    portrait: string | null;
    accent: string | null;
    games: number;
    wins: number;
    losses: number;
    takedowns: number;
    deaths: number;
    avgHeroDamage: number | null;
    avgHealing: number | null;
    avgDamageTaken: number | null;
    lastPlayed: string;
};

export type HeroList = {
    total: number;
    heroes: HeroSummary[];
};

export const getHeroList = (filters: ReplayFilters) =>
    invoke<HeroList>("get_hero_list", { filters });

export type AwardCount = Award & {
    count: number;
};

export type MapRecord = {
    id: string;
    name: string;
    loadingScreen: string | null;
    games: number;
    wins: number;
    losses: number;
};

export type TalentRecord = {
    tier: number;
    talentId: number;
    slug: string;
    name: string | null;
    description: string | null;
    icon: string | null;
    picks: number;
    wins: number;
    losses: number;
};

export type TrendPoint = {
    /** The day, as `YYYY-MM-DD` in local time. */
    day: string;
    games: number;
    wins: number;
    losses: number;
    /** Win rate over all decided career games as of this day, or `null` on a day without a decided game. */
    rate: number | null;
};

export type HeroBest = {
    replayId: number;
    value: number;
    /** The map's name. */
    map: string;
    loadingScreen: string | null;
    timestamp: string;
};

export type HeroGame = {
    replayId: number;
    map: string;
    loadingScreen: string | null;
    timestamp: string;
    duration: number;
    ownerWin: boolean | null;
    kills: number;
    deaths: number;
    assists: number;
    heroDamage: number;
};

/** Games lasting from `from` up to `to` seconds. */
export type GameLength = {
    from: number;
    /** `null` for the last length, which has no upper bound. */
    to: number | null;
    games: number;
    wins: number;
    losses: number;
};

export type AllyHero = {
    heroId: number;
    name: string;
    games: number;
};

export type WinStreak = {
    games: number;
    /** When its last game was played. */
    ended: string;
};

export type HeroBests = {
    heroDamage: HeroBest | null;
    siegeDamage: HeroBest | null;
    takedowns: HeroBest | null;
    /** The shortest win, its length in seconds as the value. */
    fastestWin: HeroBest | null;
    winStreak: WinStreak | null;
};

export type HeroDetail = {
    heroId: number;
    name: string;
    role: HeroRole | null;
    portrait: string | null;
    banner: string | null;
    accent: string | null;
    games: number;
    wins: number;
    losses: number;
    takedowns: number;
    deaths: number;
    avgKills: number | null;
    avgDeaths: number | null;
    avgAssists: number | null;
    avgTakedowns: number | null;
    avgHeroDamage: number | null;
    avgSiegeDamage: number | null;
    avgHealing: number | null;
    avgSelfHealing: number | null;
    avgDamageTaken: number | null;
    avgXp: number | null;
    avgTimeDeadSecs: number | null;
    avgDuration: number | null;
    /** Seconds across every game. */
    totalDuration: number;
    lastPlayed: string | null;
    awards: AwardCount[];
    maps: MapRecord[];
    talents: TalentRecord[];
    trend: TrendPoint[];
    bests: HeroBests;
    bestGame: HeroGame | null;
    lastGame: HeroGame | null;
    lengths: GameLength[];
    ally: AllyHero | null;
};

export const getHeroDetail = (heroId: number) =>
    invoke<HeroDetail | null>("get_hero_detail", { heroId });
