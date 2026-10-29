import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { RoleLabel } from "../role-label";
import type { RoleComparison } from "../role-performances";
import { InlineHero } from "../role-row";

import styles from "./styles.module.css";

interface KitsDifferRowProps {
    comparison: RoleComparison;
    own: boolean;
    ownerId: number;
}

export function KitsDifferRow({
    comparison,
    own,
    ownerId,
}: KitsDifferRowProps) {
    const t = useTranslations("replay.rolePerformances");

    const { ally, enemy } = comparison;

    return (
        <li className={classNames(styles.root, { [styles.own]: own })}>
            <RoleLabel comparison={comparison} />
            {ally.map((p) => (
                <InlineHero
                    key={p.playerId}
                    player={p}
                    side="ally"
                    ownerId={ownerId}
                />
            ))}
            {enemy.map((p) => (
                <InlineHero
                    key={p.playerId}
                    player={p}
                    side="enemy"
                    ownerId={ownerId}
                />
            ))}
            <Typography size="sm" variant="tertiary">
                {t("kitsDiffer")}
            </Typography>
        </li>
    );
}
