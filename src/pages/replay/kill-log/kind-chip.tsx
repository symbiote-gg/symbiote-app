import {
    CpuAi,
    Crosshair,
    Ghost,
    type LucideIcon,
    Sword,
    Swords,
} from "lucide-react";
import { useTranslations } from "use-intl";

import type { DeathKind } from "@/api/replays";
import { Chip, type ChipSize } from "@/ui";

import styles from "./styles.module.css";

const ICONS: Record<DeathKind, LucideIcon> = {
    solo: Sword,
    pick: Crosshair,
    gank: Ghost,
    skirmish: Swords,
    teamFight: Swords,
    ai: CpuAi,
};

interface KindChipProps {
    kind: DeathKind;
    size?: ChipSize;
}

export function KindChip({ kind, size }: KindChipProps) {
    const t = useTranslations("replay.killLog");

    return (
        <Chip icon={ICONS[kind]} size={size} className={styles.kind}>
            {t("kind", { kind })}
        </Chip>
    );
}
