import { useQuery } from "@tanstack/react-query";

import { thirdPartyLicensesQuery } from "@/api/queries";

export function useThirdPartyLicenses() {
    return useQuery(thirdPartyLicensesQuery);
}
