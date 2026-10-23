import { ChevronLeft } from "lucide-react";
import { useTranslations } from "use-intl";

import { ButtonLink } from "@/ui";

export interface BackToReplaysProps {
    className?: string;
}

export function BackToReplays({ className }: BackToReplaysProps) {
    const t = useTranslations("replay");

    return (
        <ButtonLink
            href="/replays"
            variant="secondary"
            size="sm"
            arrow={false}
            className={className}
        >
            <ChevronLeft />
            {t("replays")}
        </ButtonLink>
    );
}
