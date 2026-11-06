import classNames from "classnames";

import { Typography } from "@/ui";
import { type Roster, heroName, playerOf } from "@/utils/timeline/roster";

import styles from "./styles.module.css";

export interface HeroPlayerNameProps {
    slot: number;
    roster: Roster;
    inline?: boolean;
    className?: string;
}

export function HeroPlayerName({
    slot,
    roster,
    inline,
    className,
}: HeroPlayerNameProps) {
    return (
        <span
            className={classNames(
                className,
                inline ? styles.inline : styles.stacked,
            )}
        >
            <Typography
                as="span"
                size={inline ? "sm" : "base"}
                weight="semibold"
                truncate={!inline}
                noWrap={inline}
            >
                {heroName(roster, slot)}
            </Typography>
            <Typography as="span" size="sm" variant="tertiary" truncate>
                {playerOf(roster, slot)?.name}
            </Typography>
        </span>
    );
}
