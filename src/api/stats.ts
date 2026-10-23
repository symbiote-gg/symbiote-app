import { invoke } from "@tauri-apps/api/core";

import type { HeroRole } from "./replays";

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
    portrait: string | null;
    games: number;
    wins: number;
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
