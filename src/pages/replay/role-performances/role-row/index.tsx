import classNames from "classnames";
import { Fragment, type ReactNode } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { Heroes } from "../heroes";
import { ROLE_ICONS } from "../role-icons";
import { RoleLabel } from "../role-label";
import type { RoleComparison, RoleStat, Side } from "../role-performances";
import { SidePortrait } from "../side-portrait";
import { StatBar } from "../stat-bar";
import { Verdict } from "../verdict";

import styles from "./styles.module.css";

const richValue = (chunks: ReactNode) => (
    <span className={styles.value}>{chunks}</span>
);

interface RoleRowProps {
    comparison: RoleComparison;
    own: boolean;
    ownerId: number;
    formatValue: (stat: RoleStat, value: number | null) => string;
}

export function RoleRow({
    comparison,
    own,
    ownerId,
    formatValue,
}: RoleRowProps) {
    const { role, ally, enemy, stats } = comparison;

    return (
        <li className={classNames(styles.role, { [styles.own]: own })}>
            <div className={styles.head}>
                <RoleLabel comparison={comparison} />
                <Verdict comparison={comparison} />
            </div>
            <div className={styles.body}>
                <Heroes side="ally" players={ally} ownerId={ownerId} />
                <div className={styles.stats}>
                    {stats.map((stat) => (
                        <StatBar
                            key={stat.stat}
                            icon={ROLE_ICONS[role]}
                            comparison={stat}
                            ally={ally}
                            enemy={enemy}
                            ownerId={ownerId}
                            formatValue={formatValue}
                        />
                    ))}
                </div>
                <Heroes side="enemy" players={enemy} ownerId={ownerId} />
            </div>
        </li>
    );
}

/** A role only one team had, on a single line: its heroes and their numbers. */
export function OneSidedRow({
    comparison,
    own,
    ownerId,
    formatValue,
}: RoleRowProps) {
    const t = useTranslations("replay.rolePerformances");
    const format = useFormatter();

    const { ally, enemy, stats } = comparison;
    const side: Side = ally.length > 0 ? "ally" : "enemy";
    const players = side === "ally" ? ally : enemy;

    const phrases = stats
        .filter((stat) => stat[side] !== null)
        .map((stat) => {
            const value = stat[side] ?? 0;
            return (
                <Fragment key={stat.stat}>
                    {t.rich(`statPhrase.${stat.stat}`, {
                        value: formatValue(stat.stat, value),
                        count: value,
                        b: richValue,
                    })}
                </Fragment>
            );
        });
    const statList = () => format.list(phrases, { type: "unit" });

    return (
        <li
            className={classNames(styles.role, styles.oneSided, {
                [styles.own]: own,
            })}
        >
            <RoleLabel comparison={comparison} />
            {players.map((p) => (
                <span key={p.playerId} className={styles.inlineHero}>
                    <SidePortrait
                        player={p}
                        side={side}
                        owner={p.playerId === ownerId}
                        size="sm"
                    />
                    <Typography size="sm" weight="semibold" noWrap>
                        {p.heroName}
                    </Typography>
                    <Typography size="sm" variant="tertiary" noWrap>
                        {p.name}
                    </Typography>
                </span>
            ))}
            <Typography size="sm" variant="tertiary">
                {t.rich("onlyOne", { side, stats: statList })}
            </Typography>
        </li>
    );
}
