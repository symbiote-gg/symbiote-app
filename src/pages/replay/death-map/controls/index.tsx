import {
    type LucideIcon,
    Mountain,
    Pickaxe,
    Swords,
    Tombstone,
    UserRound,
    UsersRound,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslations } from "use-intl";

import { ChipButton, ChipDivider, ChipGroup } from "@/ui";
import { DEATH_FILTERS, type DeathFilter } from "../deaths";

import styles from "./styles.module.css";

const LAYERS = [
    { label: "surface", icon: Mountain },
    { label: "mines", icon: Pickaxe },
] as const;

const FILTER_ICONS: Record<DeathFilter, LucideIcon> = {
    all: Tombstone,
    team: UsersRound,
    enemy: Swords,
    you: UserRound,
};

interface ControlsProps {
    /** How many layers the map has: the switch shows for more than one. */
    layerCount: number;
    layer: number;
    counts: Record<DeathFilter, number>;
    filter: DeathFilter;
    onLayer: (layer: number) => void;
    onFilter: (filter: DeathFilter) => void;
}

export function Controls({
    layerCount,
    layer,
    counts,
    filter,
    onLayer,
    onFilter,
}: ControlsProps) {
    const t = useTranslations("replay.deathMap");

    const onLayerClick = (e: MouseEvent<HTMLButtonElement>) =>
        onLayer(Number(e.currentTarget.value));

    const onFilterClick = (e: MouseEvent<HTMLButtonElement>) =>
        onFilter(e.currentTarget.value as DeathFilter);

    const chip = (value: DeathFilter) => {
        const Icon = FILTER_ICONS[value];

        return (
            <ChipButton
                key={value}
                icon={<Icon />}
                count={counts[value]}
                pressed={value === filter}
                accent={value === "you" ? "primary" : undefined}
                value={value}
                onClick={onFilterClick}
            >
                {t(`filter.${value}`)}
            </ChipButton>
        );
    };

    const [me, ...sides] = DEATH_FILTERS;

    return (
        <div className={styles.root}>
            {layerCount > 1 && (
                <ChipGroup label={t("layer")}>
                    {LAYERS.slice(0, layerCount).map(
                        ({ label, icon: Icon }, i) => (
                            <ChipButton
                                key={label}
                                icon={<Icon />}
                                pressed={i === layer}
                                value={String(i)}
                                onClick={onLayerClick}
                            >
                                {t(label)}
                            </ChipButton>
                        ),
                    )}
                </ChipGroup>
            )}

            <ChipGroup label={t("filterLabel")}>
                {chip(me)}
                <ChipDivider />
                {sides.map(chip)}
            </ChipGroup>
        </div>
    );
}
