import { invoke } from "@tauri-apps/api/core";

import type { CareerTotals, HeroBest, WinStreak } from "./heroes";
import type { HeroRole, Mode, RoleStat } from "./replays";

export type ProfileCareer = CareerTotals & {
    /** `null` until the first replay is in. */
    name: string | null;
    accountLevel: number | null;
    mvps: number;
    mainRole: HeroRole | null;
};

export type ProfileBests = {
    heroDamage: HeroBest | null;
    siegeDamage: HeroBest | null;
    healing: HeroBest | null;
    winStreak: WinStreak | null;
    /** The shortest win, its length in seconds as the value. */
    fastestWin: HeroBest | null;
    takedowns: HeroBest | null;
};

export type PartySize = {
    size: 1 | 2 | 3 | 4 | 5;
    games: number;
    wins: number;
    losses: number;
};

export type RoleRecord = {
    role: HeroRole;
    games: number;
    wins: number;
    losses: number;
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
    sessionChange: number | null;
    pillars: ScorePillar[];
};

export type ScorePoint = {
    timestamp: string;
    score: number;
};

export type GameScore = {
    gameId: number;
    score: number;
};

export type ProfileScore = {
    score: number | null;
    margin: number | null;
    games: number;
    career: number | null;
    careerMargin: number | null;
    careerGames: number;
    sessionChange: number | null;
    sessionGames: GameScore[];
    eligibleGames: number;
    baselinePlayers: number;
    minGames: number;
    window: number;
    pillars: ScorePillar[];
    heroes: HeroScoreRow[];
    history: ScorePoint[];
};

export const getProfileCareer = () =>
    invoke<ProfileCareer>("get_profile_career");

export type ScoreScope = "all" | "draft" | "quickMatch";

export const getProfileBests = (scope: ScoreScope) =>
    invoke<ProfileBests>("get_profile_bests", { scope });

export const getPartySizes = (scope: ScoreScope) =>
    invoke<PartySize[]>("get_party_sizes", { scope });

export const getRoleRecords = (scope: ScoreScope) =>
    invoke<RoleRecord[]>("get_role_records", { scope });

export type FormAxis =
    | "heroDamage"
    | "siegeDamage"
    | "xp"
    | "killParticipation"
    | "survival"
    | "camps";

export type FormAxisRow = {
    axis: FormAxis;
    /** From 0 to 100, 50 being the owner's usual game. */
    recent: number | null;
    previous: number | null;
};

export type FormWindows = {
    recentGames: number;
    previousGames: number;
    axes: FormAxisRow[];
};

export type RoleForm = FormWindows & {
    role: HeroRole;
};

export type RecentForm = {
    all: FormWindows;
    roles: RoleForm[];
    minGames: number;
    minBaselineGames: number;
    windowDays: number;
};

export const getRecentForm = (scope: ScoreScope) =>
    invoke<RecentForm>("get_recent_form", { scope });

export const getProfileScore = (scope: ScoreScope) =>
    invoke<ProfileScore>("get_profile_score", { scope });

export type SessionHero = {
    heroId: number;
    name: string;
    portrait: string | null;
    accent: string | null;
    games: number;
    wins: number;
    losses: number;
    careerWins: number;
    careerLosses: number;
};

export type SessionGame = {
    replayId: number;
    gameId: number;
    timestamp: string;
    heroId: number;
    hero: string;
    portrait: string | null;
    map: string;
    win: boolean | null;
    mvp: boolean;
};

export type SessionRecord = {
    started: string;
    wins: number;
    losses: number;
    duration: number;
    careerWins: number;
    careerLosses: number;
    heroes: SessionHero[];
    games: SessionGame[];
};

export const getSessionRecord = () =>
    invoke<SessionRecord>("get_session_record");

export const getMostPlayedHeroes = (limit: number) =>
    invoke<MostPlayedHeroes>("get_most_played_heroes", { limit });

export const getPlayedModes = () => invoke<Mode[]>("get_played_modes");

export const getPlayedMaps = () => invoke<MapStat[]>("get_played_maps");
