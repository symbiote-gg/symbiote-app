import {
    CpuAi,
    Crosshair,
    Ghost,
    type LucideIcon,
    Sword,
    Swords,
} from "lucide-react";
import { useTranslations } from "use-intl";

import { Chip } from "@/ui";
import type { DeathKind } from "./kill-log";

import styles from "./styles.module.css";

const ICONS: Record<DeathKind, LucideIcon> = {
    solo: Sword,
    pick: Crosshair,
    gank: Ghost,
    skirmish: Swords,
    teamFight: Swords,
    ai: CpuAi,
};

export function KindChip({ kind }: { kind: DeathKind }) {
    const t = useTranslations("replay.killLog");

    return (
        <Chip icon={ICONS[kind]} className={styles.kind}>
            {t("kind", { kind })}
        </Chip>
    );
}
