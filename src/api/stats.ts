import { invoke } from "@tauri-apps/api/core";

import type { HeroRole, Mode, RoleStat } from "./replays";

export type ProfileSummary = {
    games: number;
    wins: number;
    losses: number;
    mvps: number;
    mainRole: HeroRole | null;
    recent: (boolean | null)[];
};

export type HeroStat = {
    heroId: number;
    name: string;
    role: HeroRole | null;
    portrait: string | null;
    games: number;
    wins: number;
    losses: number;
};

export type MapStat = {
    id: string;
    name: string;
    loadingScreen: string | null;
    games: number;
};

export type MostPlayedHeroes = {
    played: number;
    total: number;
    heroes: HeroStat[];
};

export type ScorePillarId = "fighting" | "survival" | "teamRole" | "map";

export type ScoreStat = {
    stat: RoleStat;
    percentile: number;
    points: number;
    max: number;
};

export type ScorePillar = {
    id: ScorePillarId;
    points: number;
    max: number;
    percentile: number;
    stats: ScoreStat[];
};

export type HeroScoreRow = {
    heroId: number;
    name: string;
    role: HeroRole | null;
    portrait: string | null;
    games: number;
    score: number;
    heroSamples: number;
    heroWeight: number;
};

export type ScorePoint = {
    timestamp: string;
    score: number;
};

export type ProfileScore = {
    score: number | null;
    margin: number | null;
    games: number;
    career: number | null;
    careerMargin: number | null;
    careerGames: number;
    eligibleGames: number;
    baselinePlayers: number;
    minGames: number;
    window: number;
    pillars: ScorePillar[];
    heroes: HeroScoreRow[];
    history: ScorePoint[];
    spread: number[];
    poolSpread: number[];
};

export const getProfileSummary = () =>
    invoke<ProfileSummary>("get_profile_summary");

export type ScoreScope = "all" | "draft" | "quickMatch";

export const getProfileScore = (scope: ScoreScope) =>
    invoke<ProfileScore>("get_profile_score", { scope });

export const getMostPlayedHeroes = (limit: number) =>
    invoke<MostPlayedHeroes>("get_most_played_heroes", { limit });

export const getPlayedModes = () => invoke<Mode[]>("get_played_modes");

export const getPlayedMaps = () => invoke<MapStat[]>("get_played_maps");
