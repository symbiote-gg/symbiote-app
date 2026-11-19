import { Swords } from "lucide-react";
import { useTranslations } from "use-intl";

import { HERO_ROLES, type HeroRole } from "@/api/replays";
import { ALL_HEROES, useMostPlayedHeroes } from "@/hooks/useMostPlayedHeroes";
import { MultiSelect } from "@/ui";

export interface RoleFilterProps {
    value: readonly HeroRole[];
    onChange: (value: HeroRole[]) => void;
}

export function RoleFilter({ value, onChange }: RoleFilterProps) {
    const t = useTranslations("filters");
    const roles = useTranslations("roles");
    const { data } = useMostPlayedHeroes(ALL_HEROES);

    const options = HERO_ROLES.filter((role) =>
        data?.heroes.some((hero) => hero.role === role),
    ).map((role) => ({ value: role, label: roles(role) }));

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
