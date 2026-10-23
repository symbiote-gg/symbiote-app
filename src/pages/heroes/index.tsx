import { useTranslations } from "use-intl";

import { ComingSoon } from "@/components";

export function Heroes() {
    const t = useTranslations("nav");

    return <ComingSoon title={t("heroes")} />;
}
