import { useQuery } from "@tanstack/react-query";

import { getThirdPartyLicenses } from "@/api/licenses";

export function useThirdPartyLicenses() {
    return useQuery({
        queryKey: ["licenses"],
        queryFn: getThirdPartyLicenses,
    });
}
