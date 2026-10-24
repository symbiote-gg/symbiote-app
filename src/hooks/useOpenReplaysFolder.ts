import { useMutation } from "@tanstack/react-query";

import { openReplaysFolder } from "@/api/settings";

export function useOpenReplaysFolder() {
    return useMutation({ mutationFn: openReplaysFolder });
}
