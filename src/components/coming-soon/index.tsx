import { useTranslations } from "use-intl";

import { Card, CardHeader } from "@/ui";
import { Page } from "../page";

export interface ComingSoonProps {
    title: string;
}

export function ComingSoon({ title }: ComingSoonProps) {
    const t = useTranslations();

    return (
        <Page>
            <Card>
                <CardHeader title={title} subtitle={t("comingSoon")} />
            </Card>
        </Page>
    );
}
