import { useQuery } from "@tanstack/react-query";

import { settingsQuery } from "@/api/queries";

export function useSettings() {
    return useQuery(settingsQuery);
}
