import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { portraitSrc } from "@/utils/portraits";
import {
    type BuildKey,
    type HeroDetail,
    getHeroDetail,
    getHeroList,
    getRandomBuild,
} from "../heroes";
import type { ReplayFilters } from "../replays";
import type { ScoreScope } from "../stats";
import { queryKeys } from "./keys";
import { preloadImage } from "./preload";

const headerArt = (hero: HeroDetail) =>
    [
        hero.banner && `/game/heroportraits/${hero.banner}`,
        hero.portrait && portraitSrc(hero.portrait, "xl"),
        hero.bestGame?.loadingScreen &&
            `/game/loadingscreens/${hero.bestGame.loadingScreen}`,
        hero.lastGame?.loadingScreen &&
            `/game/loadingscreens/${hero.lastGame.loadingScreen}`,
    ].filter((src): src is string => !!src);

export const heroDetailQuery = (heroId: number, scope: ScoreScope) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "heroes", "detail", heroId, scope],
        // Another scope keeps the page up until its own stats come, but another
        // hero never shows the last one's.
        placeholderData: (previous) =>
            previous?.heroId === heroId ? previous : undefined,
        // Resolve with the header art decoded, so the page doesn't paint before it.
        queryFn: async () => {
            const hero = await getHeroDetail(heroId, scope);
            if (hero) await Promise.all(headerArt(hero).map(preloadImage));
            return hero;
        },
    });

export const heroListQuery = (filters: ReplayFilters) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "heroes", "list", filters],
        placeholderData: keepPreviousData,
        queryFn: () => getHeroList(filters),
    });

/** Each `roll` draws another build than `exclude`, the one shown before it. */
export const randomBuildQuery = (
    heroId: number,
    scope: ScoreScope,
    roll: number,
    exclude: BuildKey | null,
) =>
    queryOptions({
        queryKey: [...queryKeys.randomBuilds, heroId, scope, roll],
        placeholderData: keepPreviousData,
        // Each mount draws its own roll, so past ones are never read again.
        gcTime: 0,
        queryFn: () => getRandomBuild(heroId, scope, exclude),
    });
