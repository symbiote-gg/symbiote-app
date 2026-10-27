import { Map as MapIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { usePlayedMaps } from "@/hooks/usePlayedMaps";
import { Combobox } from "@/ui";

import styles from "./styles.module.css";

type MapOption = {
    value: string;
    label: string;
};

export interface MapFilterProps {
    value: readonly string[];
    onChange: (value: string[]) => void;
}

export function MapFilter({ value, onChange }: MapFilterProps) {
    const t = useTranslations("filters.map");
    const { data } = usePlayedMaps();

    const options: MapOption[] = (data ?? []).map((map) => ({
        value: map.id,
        label: map.name,
    }));

    const valueLabel =
        value.length === 0
            ? t("all")
            : value.length === 1
              ? (options.find((option) => option.value === value[0])?.label ??
                t("count", { count: 1 }))
              : t("count", { count: value.length });

    const removeLabel = (map: string) => t("remove", { map });
    const noResults = () => t("noResults");

    const renderOption = ({ label }: MapOption) => (
        <span className={styles.name}>{label}</span>
    );

    return (
        <Combobox
            icon={<MapIcon />}
            label={t("label")}
            valueLabel={valueLabel}
            clearLabel={t("clear")}
            placeholder={t("search")}
            options={options}
            value={value}
            renderOption={renderOption}
            removeLabel={removeLabel}
            noResults={noResults}
            onChange={onChange}
        />
    );
}
