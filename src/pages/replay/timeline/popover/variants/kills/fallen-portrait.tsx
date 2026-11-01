import classNames from "classnames";

import { HeroPortrait } from "@/components";
import { type Roster, playerOf } from "@/utils/timeline/roster";

import styles from "./styles.module.css";

interface FallenPortraitProps {
    slot: number;
    roster: Roster;
}

export function FallenPortrait({ slot, roster }: FallenPortraitProps) {
    const victim = playerOf(roster, slot);

    return (
        <span className={styles.victim}>
            <HeroPortrait
                size="sm"
                name={victim?.heroName ?? "?"}
                portrait={victim?.heroPortrait ?? null}
                className={classNames(styles.fallen, {
                    [styles.mine]: slot === roster.highlightSlot,
                })}
            />
        </span>
    );
}
