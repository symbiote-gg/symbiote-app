import { Info } from "lucide-react";
import { useTranslations } from "use-intl";

import { Eyebrow, Tooltip } from "@/ui";
import { ROLE_ICONS } from "../role-icons";
import type { RoleComparison } from "../role-performances";

import styles from "./styles.module.css";

interface RoleLabelProps {
    comparison: RoleComparison;
}

export function RoleLabel({
    comparison: { role, ally, enemy },
}: RoleLabelProps) {
    const t = useTranslations("replay.rolePerformances");
    const roles = useTranslations("roles");

    const Icon = ROLE_ICONS[role];
    const averaged = ally.length > 1 || enemy.length > 1;

    return (
        <span className={styles.root}>
            <Icon className={styles.icon} aria-hidden />
            <Eyebrow className={styles.label}>{roles(role)}</Eyebrow>
            {averaged && (
                <Tooltip
                    content={t("averaged")}
                    description={t("averagedHint", {
                        ally: ally.length,
                        enemy: enemy.length,
                    })}
                >
                    <Info
                        className={styles.averagedInfo}
                        aria-label={t("averaged")}
                    />
                </Tooltip>
            )}
        </span>
    );
}
