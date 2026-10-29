import { Scale } from "lucide-react";
import { useMemo } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type {
    HeroRole,
    ReplayPlayerDetail,
    RolePerformance,
    RoleStat,
} from "@/api/replays";
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
    const format = useFormatter();

    const roles = useMemo(
        () => resolveRoles(performances, players),
        [performances, players],
    );

    const formatValue = (stat: RoleStat, value: number | null) => {
        if (value === null) return "-";
        if (stat === "hardCc") return formatDuration(Math.round(value));
        if (PERCENT_STATS.includes(stat))
            return format.number(value / 100, {
                style: "percent",
                maximumFractionDigits: 0,
            });

        return format.number(value, {
            notation: "compact",
            maximumFractionDigits: 1,
        });
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
