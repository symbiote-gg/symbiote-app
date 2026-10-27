import { useTranslations } from "use-intl";

import { ROLE_ICONS } from "../role-icons";
import { type RoleComparison, verdictOf } from "../role-performances";
import { Verdict } from "../verdict";

import styles from "./styles.module.css";

interface VerdictTallyProps {
    roles: RoleComparison[];
}

export function VerdictTally({ roles }: VerdictTallyProps) {
    const roleNames = useTranslations("roles");

    const shared = roles.filter((comparison) => verdictOf(comparison) !== null);
    if (shared.length === 0) return null;

    return (
        <ul className={styles.root}>
            {shared.map((comparison) => (
                <li key={comparison.role}>
                    <span className={styles.role}>
                        {roleNames(comparison.role)}
                    </span>
                    <Verdict
                        comparison={comparison}
                        icon={ROLE_ICONS[comparison.role]}
                    />
                </li>
            ))}
        </ul>
    );
}
