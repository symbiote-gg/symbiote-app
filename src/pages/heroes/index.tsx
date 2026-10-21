import { useTranslations } from "use-intl";

import { Page } from "@/components";
import { Card, CardHeader } from "@/ui";

export function Heroes() {
    const t = useTranslations();

    return (
        <Page>
            <Card>
                <CardHeader
                    title={t("nav.heroes")}
                    subtitle={t("comingSoon")}
                />
            </Card>
        </Page>
    );
}
