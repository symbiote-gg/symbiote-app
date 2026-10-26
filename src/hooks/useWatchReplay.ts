import { useMutation } from "@tanstack/react-query";

import { watchReplay } from "@/api/replays";

export function useWatchReplay() {
    return useMutation({ mutationFn: watchReplay });
}
