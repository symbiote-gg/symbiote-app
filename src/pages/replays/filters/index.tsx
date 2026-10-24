import { RotateCcw } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroRole, Mode } from "@/api/replays";
import {
    DateFilter,
    HeroFilter,
    ModeFilter,
    ResultFilter,
    RoleFilter,
} from "@/components";
import { ALL_HEROES, useMostPlayedHeroes } from "@/hooks/useMostPlayedHeroes";
import { Button } from "@/ui";
import type { DateRange } from "@/utils/date-range";
import { type FilterState, NO_FILTERS, activeFilters } from "./state";

import styles from "./styles.module.css";

export interface FiltersProps {
    value: FilterState;
    onChange: (value: FilterState) => void;
}

export function Filters({ value, onChange }: FiltersProps) {
    const t = useTranslations("replays.filters");
    const { data } = useMostPlayedHeroes(ALL_HEROES);

    const onModes = (modes: Mode[]) => onChange({ ...value, modes });
    const onWin = (win: boolean | null) => onChange({ ...value, win });
    const onDate = (date: DateRange) => onChange({ ...value, date });
    const onHeroes = (heroes: number[]) => onChange({ ...value, heroes });
    const onReset = () => onChange(NO_FILTERS);

    // A picked hero outside the picked roles would leave the list empty. Until the heroes
    // load their roles are unknown, so the picks are kept.
    const onRoles = (roles: HeroRole[]) => {
        const roleOf = new Map(
            data?.heroes.map((hero) => [hero.heroId, hero.role]),
        );
        const heroes =
            roles.length === 0 || !data
                ? value.heroes
                : value.heroes.filter((id) => {
                      const role = roleOf.get(id);
                      return !!role && roles.includes(role);
                  });
        onChange({ ...value, roles, heroes });
    };

    const active = activeFilters(value);

    return (
        <div role="group" aria-label={t("label")} className={styles.root}>
            <div className={styles.filters}>
                <ModeFilter value={value.modes} onChange={onModes} />
                <ResultFilter value={value.win} onChange={onWin} />
                <DateFilter value={value.date} onChange={onDate} />
                <RoleFilter value={value.roles} onChange={onRoles} />
                <HeroFilter
                    value={value.heroes}
                    roles={value.roles}
                    onChange={onHeroes}
                />
            </div>
            {active >= 2 && (
                <Button
                    variant="secondary"
                    size="sm"
                    className={styles.reset}
                    onClick={onReset}
                >
                    <RotateCcw aria-hidden />
                    {t("reset", { count: active })}
                </Button>
            )}
        </div>
    );
}
