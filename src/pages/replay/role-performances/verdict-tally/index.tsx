import { ROLE_ICONS } from "../role-icons";
import { type RoleComparison, verdictOf } from "../role-performances";
import { Verdict } from "../verdict";

import styles from "./styles.module.css";

interface VerdictTallyProps {
    roles: RoleComparison[];
}

export function VerdictTally({ roles }: VerdictTallyProps) {
    const shared = roles.filter((comparison) => verdictOf(comparison) !== null);
    if (shared.length === 0) return null;

    return (
        <ul className={styles.root}>
            {shared.map((comparison) => (
                <li key={comparison.role}>
                    <Verdict
                        comparison={comparison}
                        icon={ROLE_ICONS[comparison.role]}
                    />
                </li>
            ))}
        </ul>
    );
}
