import { useTranslations } from "use-intl";

import { ComingSoon } from "@/components";

export function Profile() {
    const t = useTranslations("nav");

    return <ComingSoon title={t("profile")} />;
}
