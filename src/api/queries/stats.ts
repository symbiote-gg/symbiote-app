import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import {
    type ScoreScope,
    getMostPlayedHeroes,
    getPartySizes,
    getPlayedMaps,
    getPlayedModes,
    getProfileBests,
    getProfileCareer,
    getProfileScore,
    getRecentForm,
    getRoleRecords,
    getSessionBests,
    getSessionRecord,
    getTeammates,
} from "../stats";
import { queryKeys } from "./keys";

export const profileScoreQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "profile-score", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        // With its scope, as a new scope's query shows the last one's score
        // until its own comes.
        queryFn: async () => ({ scope, ...(await getProfileScore(scope)) }),
    });

export const profileCareerQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "profile-career", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        queryFn: () => getProfileCareer(scope),
    });

export const profileBestsQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "profile-bests", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        queryFn: () => getProfileBests(scope),
    });

export const partySizesQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "party-sizes", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        queryFn: () => getPartySizes(scope),
    });

export const roleRecordsQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "roles", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        queryFn: () => getRoleRecords(scope),
    });

export const teammatesQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "teammates", scope],
        gcTime: Infinity,
        placeholderData: keepPreviousData,
        queryFn: () => getTeammates(scope),
    });

export const recentFormQuery = (scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "recent-form", scope],
        gcTime: Infinity,
        // The windows end at the backend's now, so they slide with the clock too.
        staleTime: 60 * 60 * 1000,
        queryFn: () => getRecentForm(scope),
        placeholderData: keepPreviousData,
    });

export const sessionRecordQuery = queryOptions({
    queryKey: [...queryKeys.stats, "session"],
    gcTime: Infinity,
    queryFn: getSessionRecord,
});

export const sessionBestsQuery = queryOptions({
    queryKey: [...queryKeys.stats, "session-bests"],
    gcTime: Infinity,
    queryFn: getSessionBests,
});

/** The backend clamps the limit to `MAX_MOST_PLAYED_HEROES`, so raise both together. */
export const ALL_HEROES = 200;

export const mostPlayedHeroesQuery = (limit: number) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "most-played-heroes", limit],
        gcTime: Infinity,
        queryFn: () => getMostPlayedHeroes(limit),
    });

export const playedModesQuery = queryOptions({
    queryKey: [...queryKeys.stats, "played-modes"],
    gcTime: Infinity,
    queryFn: getPlayedModes,
});

export const playedMapsQuery = queryOptions({
    queryKey: [...queryKeys.stats, "played-maps"],
    gcTime: Infinity,
    queryFn: getPlayedMaps,
});
