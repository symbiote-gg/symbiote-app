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

export type WinStreak = {
    games: number;
    /** When its last game was played. */
    ended: string;
};

export type HeroBests = {
    heroDamage: HeroBest | null;
    siegeDamage: HeroBest | null;
    healing: HeroBest | null;
    damageTaken: HeroBest | null;
    xp: HeroBest | null;
    takedowns: HeroBest | null;
    /** The shortest win, its length in seconds as the value. */
    fastestWin: HeroBest | null;
    /** The win with the fewest deaths, zero included. */
    fewestDeathsWin: HeroBest | null;
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
    kills: number;
    assists: number;
    heroDamage: number;
    siegeDamage: number;
    healing: number;
    selfHealing: number;
    damageTaken: number;
    xp: number;
    globes: number;
    camps: number;
    avgKills: number | null;
    avgDeaths: number | null;
    avgAssists: number | null;
    avgHeroDamage: number | null;
    avgSiegeDamage: number | null;
    avgHealing: number | null;
    avgSelfHealing: number | null;
    avgDamageTaken: number | null;
    avgXp: number | null;
    avgTimeDeadSecs: number | null;
    /** The owner's average share of their team's kills, from 0 to 1. */
    killParticipation: number | null;
    /** The owner's average share of their team's total, from 0 to 1, for each stat. */
    shareHeroDamage: number | null;
    shareSiegeDamage: number | null;
    shareDamageTaken: number | null;
    shareHealing: number | null;
    shareXp: number | null;
    avgDuration: number | null;
    /** Seconds across every game. */
    totalDuration: number;
    totalTimeDeadSecs: number;
    awards: AwardCount[];
    maps: MapRecord[];
    talents: TalentRecord[];
    trend: TrendPoint[];
    bests: HeroBests;
    bestGame: HeroGame | null;
    lastGame: HeroGame | null;
    lengths: GameLength[];
};

export const getHeroDetail = (heroId: number) =>
    invoke<HeroDetail | null>("get_hero_detail", { heroId });
