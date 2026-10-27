import type { LucideIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { Chip } from "@/ui";
import { type RoleComparison, verdictOf } from "../role-performances";

interface VerdictProps {
    comparison: RoleComparison;
    icon?: LucideIcon;
}

export function Verdict({ comparison, icon }: VerdictProps) {
    const t = useTranslations("replay.rolePerformances");

    const verdict = verdictOf(comparison);
    if (verdict === null) return null;

    if (verdict === "even") {
        return (
            <Chip size="sm" uppercase icon={icon}>
                {t("even")}
            </Chip>
        );
    }

    return (
        <Chip
            size="sm"
            uppercase
            icon={icon}
            tone={verdict === "ally" ? "win" : "loss"}
        >
            {t("ahead", { side: verdict })}
        </Chip>
    );
}
