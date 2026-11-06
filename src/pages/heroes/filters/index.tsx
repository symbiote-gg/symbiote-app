import { ArrowDownUp } from "lucide-react";
import { useTranslations } from "use-intl";

import type { HeroRole, Mode } from "@/api/replays";
import { DateFilter, FilterBar, ModeFilter, RoleFilter } from "@/components";
import { SearchInput, Select } from "@/ui";
import type { DateRange } from "@/utils/date-range";
import {
    type FilterState,
    HERO_SORTS,
    type HeroSort,
    NO_FILTERS,
    activeFilters,
} from "./state";

export interface FiltersProps {
    value: FilterState;
    onChange: (value: FilterState) => void;
}

export function Filters({ value, onChange }: FiltersProps) {
    const t = useTranslations("heroes.filters");

    const onModes = (modes: Mode[]) => onChange({ ...value, modes });
    const onDate = (date: DateRange) => onChange({ ...value, date });
    const onRoles = (roles: HeroRole[]) => onChange({ ...value, roles });
    const onName = (name: string) => onChange({ ...value, name });
    const onSort = (sort: HeroSort | null) =>
        onChange({ ...value, sort: sort ?? NO_FILTERS.sort });
    const onReset = () => onChange({ ...NO_FILTERS, sort: value.sort });

    const sorts = HERO_SORTS.map((sort) => ({
        value: sort,
        label: t(`sort.${sort}`),
    }));

    const active = activeFilters(value);

    return (
        <FilterBar
            label={t("label")}
            active={active}
            resetLabel={t("clear", { count: active })}
            onReset={onReset}
        >
            <SearchInput
                value={value.name}
                label={t("search.label")}
                placeholder={t("search.placeholder")}
                clearLabel={t("search.clear")}
                onChange={onName}
            />
            <ModeFilter value={value.modes} onChange={onModes} />
            <DateFilter value={value.date} onChange={onDate} />
            <RoleFilter value={value.roles} onChange={onRoles} />
            <Select
                icon={<ArrowDownUp />}
                label={t("sort.label")}
                options={sorts}
                value={value.sort === NO_FILTERS.sort ? null : value.sort}
                emptyLabel={t(`sort.${NO_FILTERS.sort}`)}
                clearLabel={t("sort.clear")}
                onChange={onSort}
            />
        </FilterBar>
    );
}
