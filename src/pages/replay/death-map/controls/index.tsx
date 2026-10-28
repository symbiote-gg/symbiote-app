import {
    Crosshair,
    type LucideIcon,
    Mountain,
    Pickaxe,
    Shield,
    Tombstone,
    UserRound,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslations } from "use-intl";

import { ChipButton, ChipDivider, ChipGroup } from "@/ui";
import type { DeathFilter } from "../deaths";

import styles from "./styles.module.css";

const LAYERS = [
    { label: "surface", icon: Mountain },
    { label: "mines", icon: Pickaxe },
] as const;

const TEAM_FILTERS: { filter: DeathFilter; icon: LucideIcon }[] = [
    { filter: "all", icon: Tombstone },
    { filter: "team", icon: Shield },
    { filter: "enemy", icon: Crosshair },
];

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

    // pressing the shown filter again goes back to every death, as "Me" does on the timeline
    const onFilterClick = (e: MouseEvent<HTMLButtonElement>) => {
        const next = e.currentTarget.value as DeathFilter;
        onFilter(next === filter ? "all" : next);
    };

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
                <ChipButton
                    icon={<UserRound />}
                    count={counts.you}
                    pressed={filter === "you"}
                    accent="primary"
                    value="you"
                    onClick={onFilterClick}
                >
                    {t("filter.you")}
                </ChipButton>
                <ChipDivider />
                {TEAM_FILTERS.map(({ filter: value, icon: Icon }) => (
                    <ChipButton
                        key={value}
                        icon={<Icon />}
                        count={counts[value]}
                        pressed={filter === value}
                        value={value}
                        onClick={onFilterClick}
                    >
                        {t(`filter.${value}`)}
                    </ChipButton>
                ))}
            </ChipGroup>
        </div>
    );
}
