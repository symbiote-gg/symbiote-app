import { UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import type { HeroRole } from "@/api/replays";
import type { HeroStat } from "@/api/stats";
import { ALL_HEROES, useMostPlayedHeroes } from "@/hooks/useMostPlayedHeroes";
import { Combobox } from "@/ui";
import { HeroPortrait } from "../hero-portrait";

import styles from "./styles.module.css";

type HeroOption = {
    value: number;
    label: string;
    hero: HeroStat;
};

export interface HeroFilterProps {
    value: readonly number[];
    roles: readonly HeroRole[];
    onChange: (value: number[]) => void;
}

export function HeroFilter({ value, roles, onChange }: HeroFilterProps) {
    const t = useTranslations("filters.hero");
    const roleNames = useTranslations("roles");
    const { data } = useMostPlayedHeroes(ALL_HEROES);

    const options: HeroOption[] = (data?.heroes ?? [])
        .filter(
            (hero) =>
                roles.length === 0 || (hero.role && roles.includes(hero.role)),
        )
        .map((hero) => ({ value: hero.heroId, label: hero.name, hero }));

    const valueLabel =
        value.length === 0
            ? t("any")
            : value.length === 1
              ? (options.find((option) => option.value === value[0])?.label ??
                t("count", { count: 1 }))
              : t("count", { count: value.length });

    const removeLabel = (hero: string) => t("remove", { hero });
    const noResults = (query: string) => t("noResults", { query });
    const footer = (results: number) => t("results", { count: results });

    const renderOption = ({ hero }: HeroOption, label: ReactNode) => (
        <>
            <HeroPortrait name={hero.name} portrait={hero.portrait} size="xs" />
            <span className={styles.names}>
                <span className={styles.name}>{label}</span>
                {hero.role && (
                    <span className={styles.role}>{roleNames(hero.role)}</span>
                )}
            </span>
        </>
    );

    return (
        <Combobox
            icon={<UserRound />}
            label={t("label")}
            valueLabel={valueLabel}
            clearLabel={t("clear")}
            placeholder={t("search")}
            sectionLabel={t("mostPlayed")}
            clearSearchLabel={t("clearSearch")}
            options={options}
            value={value}
            renderOption={renderOption}
            removeLabel={removeLabel}
            noResults={noResults}
            footer={footer}
            onChange={onChange}
        />
    );
}
