import classNames from "classnames";

import type { ReplayPlayerDetail } from "@/api/replays";
import { HeroPortrait, type HeroPortraitProps } from "@/components";
import { sideClasses } from "../../side";
import type { TeamSide } from "../role-performances";

import styles from "./styles.module.css";

interface SidePortraitProps {
    player: ReplayPlayerDetail;
    side: TeamSide;
    owner: boolean;
    size: HeroPortraitProps["size"];
}

export function SidePortrait({ player, side, owner, size }: SidePortraitProps) {
    return (
        <HeroPortrait
            name={player.heroName}
            portrait={player.heroPortrait}
            size={size}
            className={classNames(styles.portrait, sideClasses(side), {
                [styles.owner]: owner,
            })}
        />
    );
}
