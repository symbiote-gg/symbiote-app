import { useFormatter, useTranslations } from "use-intl";

import type { RoleScore } from "@/api/replays";
import { Chip } from "@/ui";

interface GapProps {
    score: RoleScore;
}

export function Gap({ score: { gap, verdict } }: GapProps) {
    const t = useTranslations("replay.rolePerformances");
    const format = useFormatter();

    if (verdict === null || gap === null) return null;

    if (verdict === "even")
        return (
            <Chip uppercase size="sm">
                {t("even")}
            </Chip>
        );

    return (
        <Chip size="sm" tone={verdict === "ally" ? "win" : "loss"}>
            {format.number(gap, { signDisplay: "exceptZero" })}
        </Chip>
    );
}
