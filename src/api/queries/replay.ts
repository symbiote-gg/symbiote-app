import { queryOptions } from "@tanstack/react-query";

import { getReplay, getStandouts } from "../replays";
import { queryKeys } from "./keys";
import { preloadImage } from "./preload";

export const replayQuery = (id: number) =>
    queryOptions({
        queryKey: [...queryKeys.replayDetails, id],
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

export const standoutsQuery = (id: number) =>
    queryOptions({
        queryKey: [...queryKeys.standouts, id],
        queryFn: () => getStandouts(id),
    });
