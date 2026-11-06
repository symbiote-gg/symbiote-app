import { Scale } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import type {
    HeroRole,
    ReplayPlayerDetail,
    RolePerformance,
    RoleStat,
} from "@/api/replays";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Card, CardHeader } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { KitsDifferRow } from "./kits-differ-row";
import {
    type RoleComparison,
    isShared,
    resolveRoles,
} from "./role-performances";
import { OneSidedRow, RoleRow } from "./role-row";
import { VerdictTally } from "./verdict-tally";

import styles from "./styles.module.css";

const PERCENT_STATS: RoleStat[] = [
    "killParticipation",
    "deathShare",
    "damageTakenShare",
    "teamfightDamageTakenShare",
];

interface RolePerformancesProps {
    performances: RolePerformance[];
    players: ReplayPlayerDetail[];
    ownerId: number;
    ownerRole: HeroRole | null;
}

export function RolePerformances({
    performances,
    players,
    ownerId,
    ownerRole,
}: RolePerformancesProps) {
    const t = useTranslations("replay.rolePerformances");
    const { compact, percent } = useFormatStat();

    const roles = useMemo(
        () => resolveRoles(performances, players),
        [performances, players],
    );

    const formatValue = (stat: RoleStat, value: number | null) => {
        if (value === null) return "-";
        if (stat === "hardCc") return formatDuration(value);
        if (PERCENT_STATS.includes(stat)) return percent(value / 100);

        return compact(value);
    };

    const renderRow = (comparison: RoleComparison) => {
        const key = comparison.role;
        const props = {
            comparison,
            own: comparison.role === ownerRole,
            ownerId,
        };

        if (!isShared(comparison))
            return (
                <OneSidedRow key={key} {...props} formatValue={formatValue} />
            );
        if (comparison.kitsDiffer)
            return <KitsDifferRow key={key} {...props} />;

        return <RoleRow key={key} {...props} formatValue={formatValue} />;
    };

    if (roles.length === 0) return null;

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={Scale}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
                action={<VerdictTally roles={roles} />}
            />
            <ul className={styles.roles}>{roles.map(renderRow)}</ul>
        </Card>
    );
}
