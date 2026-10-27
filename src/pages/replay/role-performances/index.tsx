import { Scale } from "lucide-react";
import { useMemo } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { HeroRole, ReplayPlayerDetail } from "@/api/replays";
import { Card, CardHeader } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { type RoleStat, compareRoles, isShared } from "./role-performances";
import { OneSidedRow, RoleRow } from "./role-row";
import { VerdictTally } from "./verdict-tally";

import styles from "./styles.module.css";

interface RolePerformancesProps {
    players: ReplayPlayerDetail[];
    allyTeam: number;
    ownerId: number;
    ownerRole: HeroRole | null;
}

export function RolePerformances({
    players,
    allyTeam,
    ownerId,
    ownerRole,
}: RolePerformancesProps) {
    const t = useTranslations("replay.rolePerformances");
    const format = useFormatter();

    const roles = useMemo(
        () => compareRoles(players, allyTeam, ownerRole),
        [players, allyTeam, ownerRole],
    );

    const formatValue = (stat: RoleStat, value: number | null) => {
        if (value === null) return "-";
        if (stat === "hardCc") return formatDuration(Math.round(value));

        return format.number(value, {
            notation: "compact",
            maximumFractionDigits: 1,
        });
    };

    if (roles.length === 0) return null;

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={Scale}
                size="sm"
                title={t("title")}
                meta={<VerdictTally roles={roles} />}
            />
            <ul className={styles.roles}>
                {roles.map((comparison) =>
                    isShared(comparison) ? (
                        <RoleRow
                            key={comparison.role}
                            comparison={comparison}
                            own={comparison.role === ownerRole}
                            ownerId={ownerId}
                            formatValue={formatValue}
                        />
                    ) : (
                        <OneSidedRow
                            key={comparison.role}
                            comparison={comparison}
                            own={comparison.role === ownerRole}
                            ownerId={ownerId}
                            formatValue={formatValue}
                        />
                    ),
                )}
            </ul>
        </Card>
    );
}
