import { Swords } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroRole } from "@/api/replays";
import { MultiSelect } from "@/ui";

const ROLES: readonly HeroRole[] = [
    "tank",
    "bruiser",
    "healer",
    "support",
    "melee_assassin",
    "ranged_assassin",
];

export interface RoleFilterProps {
    value: readonly HeroRole[];
    onChange: (value: HeroRole[]) => void;
}

export function RoleFilter({ value, onChange }: RoleFilterProps) {
    const t = useTranslations("filters");
    const roles = useTranslations("roles");

    const options = ROLES.map((role) => ({ value: role, label: roles(role) }));

    const valueLabel =
        value.length === 0
            ? t("role.all")
            : value.length === 1
              ? roles(value[0])
              : t("role.count", { count: value.length });

    return (
        <MultiSelect
            icon={<Swords />}
            label={t("role.label")}
            valueLabel={valueLabel}
            clearLabel={t("role.clear")}
            options={options}
            value={value}
            onChange={onChange}
        />
    );
}
