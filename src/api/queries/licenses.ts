import { queryOptions } from "@tanstack/react-query";

import { getThirdPartyLicenses } from "../licenses";
import { queryKeys } from "./keys";

export const thirdPartyLicensesQuery = queryOptions({
    queryKey: queryKeys.licenses,
    queryFn: getThirdPartyLicenses,
});
