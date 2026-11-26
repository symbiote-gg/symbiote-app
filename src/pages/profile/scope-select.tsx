import { Gamepad2 } from "lucide-react";
import { useTranslations } from "use-intl";

import type { ScoreScope } from "@/api/stats";
import { Select } from "@/ui";

type ModeScope = Exclude<ScoreScope, "all">;

const SCOPES: readonly ModeScope[] = ["draft", "quickMatch"];

export interface ScopeSelectProps {
    scope: ScoreScope;
    onChange: (scope: ScoreScope) => void;
}

export function ScopeSelect({ scope, onChange }: ScopeSelectProps) {
    const t = useTranslations("profile.scope");

    const onScope = (value: ModeScope | null) => onChange(value ?? "all");

    const scopes = SCOPES.map((value) => ({
        value,
        label: t(value),
    }));

    return (
        <Select
            icon={<Gamepad2 />}
            label={t("label")}
            options={scopes}
            value={scope === "all" ? null : scope}
            emptyLabel={t("all")}
            clearLabel={t("clear")}
            onChange={onScope}
        />
    );
}
