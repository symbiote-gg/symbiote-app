import { queryOptions } from "@tanstack/react-query";

import { getReplay, getStandouts } from "../replays";
import { preloadImage } from "./preload";

export const replayQuery = (id: number) =>
    queryOptions({
        queryKey: ["replays", "detail", id],
        // Resolve with the header art decoded, so the page doesn't paint before it.
        queryFn: async () => {
            const replay = await getReplay(id);
            if (replay.mapLoadingScreen)
                await preloadImage(
                    `/game/loadingscreens/${replay.mapLoadingScreen}`,
                );
            return replay;
        },
    });

export const STANDOUTS_KEY = ["replays", "standouts"];

export const standoutsQuery = (id: number) =>
    queryOptions({
        queryKey: [...STANDOUTS_KEY, id],
        queryFn: () => getStandouts(id),
    });
