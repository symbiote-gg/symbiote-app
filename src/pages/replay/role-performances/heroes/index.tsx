import classNames from "classnames";
import { useFormatter, useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import type { TeamSide } from "../role-performances";
import { SidePortrait } from "../side-portrait";

import styles from "./styles.module.css";

interface HeroesProps {
    side: TeamSide;
    players: ReplayPlayerDetail[];
    ownerId: number;
}

export function Heroes({ side, players, ownerId }: HeroesProps) {
    const t = useTranslations("replay.rolePerformances");
    const format = useFormatter();

    return (
        <span className={classNames(styles.root, styles[side])}>
            <span className={styles.portraits}>
                {[...players].reverse().map((p) => (
                    <Tooltip
                        key={p.playerId}
                        content={t("hero", {
                            player: p.name,
                            hero: p.heroName,
                        })}
                    >
                        <SidePortrait
                            player={p}
                            side={side}
                            owner={p.playerId === ownerId}
                            size="md"
                        />
                    </Tooltip>
                ))}
            </span>
            <span className={styles.text}>
                <Typography as="span" weight="semibold" truncate>
                    {format.list(
                        players.map((p) => p.heroName),
                        { type: "unit" },
                    )}
                </Typography>
                <Typography as="span" size="sm" variant="tertiary" truncate>
                    {format.list(
                        players.map((p) => p.name),
                        { type: "unit" },
                    )}
                </Typography>
            </span>
        </span>
    );
}
