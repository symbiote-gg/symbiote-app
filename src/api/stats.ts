import { invoke } from "@tauri-apps/api/core";

import type { HeroRole, Mode } from "./replays";

export type ProfileSummary = {
    games: number;
    wins: number;
    losses: number;
    mvps: number;
    topDamageGames: number;
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

export const getProfileSummary = (since: Date) =>
    invoke<ProfileSummary>("get_profile_summary", {
        since: Math.floor(since.getTime() / 1000),
    });

export const getMostPlayedHeroes = (limit: number) =>
    invoke<MostPlayedHeroes>("get_most_played_heroes", { limit });

export const getPlayedModes = () => invoke<Mode[]>("get_played_modes");

export const getPlayedMaps = () => invoke<MapStat[]>("get_played_maps");
