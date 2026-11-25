import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { portraitSrc } from "@/utils/portraits";
import { type HeroDetail, getHeroDetail, getHeroList } from "../heroes";
import type { ReplayFilters } from "../replays";
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

export const heroDetailQuery = (heroId: number) =>
    queryOptions({
        queryKey: [...queryKeys.stats, "heroes", "detail", heroId],
        // Resolve with the header art decoded, so the page doesn't paint before it.
        queryFn: async () => {
            const hero = await getHeroDetail(heroId);
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
