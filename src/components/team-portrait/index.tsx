import classNames from "classnames";

import { type Roster, playerOf } from "@/utils/timeline/roster";
import { HeroPortrait } from "../hero-portrait";

import styles from "./styles.module.css";

interface TeamPortraitProps {
    slot: number;
    size: "xs" | "sm";
    roster: Roster;
    thin?: boolean;
}

export function TeamPortrait({ slot, size, roster, thin }: TeamPortraitProps) {
    const player = playerOf(roster, slot);

    return (
        <HeroPortrait
            size={size}
            name={player?.heroName ?? "?"}
            portrait={player?.heroPortrait ?? null}
            className={classNames(
                styles.portrait,
                slot === roster.highlightSlot
                    ? styles.mine
                    : player?.team === roster.allyTeam
                      ? styles.ally
                      : styles.enemy,
                { [styles.thin]: thin },
            )}
        />
    );
}
