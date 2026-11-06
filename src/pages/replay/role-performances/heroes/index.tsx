import classNames from "classnames";
import { useFormatter } from "use-intl";

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
    const format = useFormatter();
    const ordered = [...players].reverse();

    return (
        <span className={classNames(styles.root, styles[side])}>
            <span className={styles.portraits}>
                {ordered.map((p) => (
                    <SidePortrait
                        key={p.playerId}
                        player={p}
                        side={side}
                        owner={p.playerId === ownerId}
                        size="md"
                    />
                ))}
            </span>
            <span className={styles.text}>
                <Typography as="span" weight="semibold" truncate>
                    {format.list(
                        ordered.map((p) => p.heroName),
                        { type: "unit" },
                    )}
                </Typography>
                <Typography as="span" size="sm" variant="tertiary" truncate>
                    {format.list(
                        ordered.map((p) => p.name),
                        { type: "unit" },
                    )}
                </Typography>
            </span>
        </span>
    );
}
