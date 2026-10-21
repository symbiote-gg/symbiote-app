import { useTranslations } from "use-intl";

import { Page } from "@/components";
import { Card, CardHeader } from "@/ui";

export function Profile() {
    const t = useTranslations();

    return (
        <Page>
            <Card>
                <CardHeader
                    title={t("nav.profile")}
                    subtitle={t("comingSoon")}
                />
            </Card>
        </Page>
    );
}
