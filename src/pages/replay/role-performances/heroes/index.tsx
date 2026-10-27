import classNames from "classnames";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Typography } from "@/ui";
import type { TeamSide } from "../role-performances";
import { SidePortrait } from "../side-portrait";

import styles from "./styles.module.css";

interface HeroesProps {
    side: TeamSide;
    players: ReplayPlayerDetail[];
    ownerId: number;
}

export function Heroes({ side, players, ownerId }: HeroesProps) {
    return (
        <div className={classNames(styles.root, styles[side])}>
            {players.map((p) => (
                <span key={p.playerId} className={styles.hero}>
                    <SidePortrait
                        player={p}
                        side={side}
                        owner={p.playerId === ownerId}
                        size="md"
                    />
                    <span className={styles.text}>
                        <Typography weight="semibold" truncate>
                            {p.heroName}
                        </Typography>
                        <Typography size="sm" variant="tertiary" truncate>
                            {p.name}
                        </Typography>
                    </span>
                </span>
            ))}
        </div>
    );
}
