import { useQuery } from "@tanstack/react-query";
import { Gamepad2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { playedModesQuery } from "@/api/queries";
import type { Mode } from "@/api/replays";
import { MultiSelect } from "@/ui";

const MODES: readonly Mode[] = [
    "quick_match",
    "unranked_draft",
    "storm_league",
    "hero_league",
    "team_league",
    "aram",
    "brawl",
    "versus_ai",
    "custom",
    "unknown",
];

export interface ModeFilterProps {
    value: readonly Mode[];
    onChange: (value: Mode[]) => void;
}

export function ModeFilter({ value, onChange }: ModeFilterProps) {
    const t = useTranslations("filters");
    const modes = useTranslations("modes");
    const { data } = useQuery(playedModesQuery);

    const options = MODES.filter((mode) => data?.includes(mode)).map(
        (mode) => ({ value: mode, label: modes(mode) }),
    );

    const valueLabel =
        value.length === 0
            ? t("mode.all")
            : value.length === 1
              ? modes(value[0])
              : t("mode.count", { count: value.length });

    return (
        <MultiSelect
            icon={<Gamepad2 />}
            label={t("mode.label")}
            valueLabel={valueLabel}
            clearLabel={t("mode.clear")}
            options={options}
            value={value}
            onChange={onChange}
        />
    );
}
