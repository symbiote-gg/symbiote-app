import classNames from "classnames";
import { ChevronDown } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";
import { useFormatter, useTranslations } from "use-intl";

import type { ReplayPlayerDetail, RoleStat } from "@/api/replays";
import { Typography } from "@/ui";
import { Gap } from "../gap";
import { Heroes } from "../heroes";
import { RoleLabel } from "../role-label";
import type { RoleComparison, TeamSide } from "../role-performances";
import { ScoreBar } from "../score-bar";
import { ScoreBreakdown } from "../score-breakdown";
import { SidePortrait } from "../side-portrait";

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
    const [open, setOpen] = useState(false);

    const onToggle = () => {
        setOpen((value) => !value);
    };

    const { ally, enemy, score, heroes, columns } = comparison;

    return (
        <li className={classNames(styles.role, { [styles.own]: own })}>
            <button
                type="button"
                aria-expanded={open}
                className={styles.summary}
                onClick={onToggle}
            >
                <span className={styles.label}>
                    <RoleLabel comparison={comparison} />
                    <Gap score={score} />
                </span>
                <Heroes side="ally" players={ally} ownerId={ownerId} />
                <ScoreBar score={score} className={styles.score} />
                <Heroes side="enemy" players={enemy} ownerId={ownerId} />
                <ChevronDown size={16} className={styles.chevron} />
            </button>
            {open && (
                <div className={styles.breakdown}>
                    <ScoreBreakdown
                        columns={columns}
                        heroes={heroes}
                        formatValue={formatValue}
                    />
                </div>
            )}
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
    const side: TeamSide = ally.length > 0 ? "ally" : "enemy";
    const players = side === "ally" ? ally : enemy;

    const phrases = stats
        .filter((stat) => stat[side] !== null)
        .map((stat) => (
            <Fragment key={stat.stat}>
                {t.rich(`statPhrase.${stat.stat}`, {
                    value: formatValue(stat.stat, stat[side]),
                    b: richValue,
                })}
            </Fragment>
        ));
    const statList = () => format.list(phrases, { type: "unit" });

    return (
        <li
            className={classNames(styles.role, styles.oneSided, {
                [styles.own]: own,
            })}
        >
            <RoleLabel comparison={comparison} />
            {players.map((p) => (
                <InlineHero
                    key={p.playerId}
                    player={p}
                    side={side}
                    ownerId={ownerId}
                />
            ))}
            {phrases.length > 0 && (
                <Typography size="sm" variant="tertiary">
                    {t.rich("onlyOne", { side, stats: statList })}
                </Typography>
            )}
        </li>
    );
}

interface InlineHeroProps {
    player: ReplayPlayerDetail;
    side: TeamSide;
    ownerId: number;
}

export function InlineHero({ player, side, ownerId }: InlineHeroProps) {
    return (
        <span className={styles.inlineHero}>
            <SidePortrait
                player={player}
                side={side}
                owner={player.playerId === ownerId}
                size="sm"
            />
            <Typography size="sm" weight="semibold" noWrap>
                {player.heroName}
            </Typography>
            <Typography size="sm" variant="tertiary" noWrap>
                {player.name}
            </Typography>
        </span>
    );
}
