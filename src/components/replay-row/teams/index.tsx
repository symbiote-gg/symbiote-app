import classNames from "classnames";
import { Swords } from "lucide-react";
import { useTranslations } from "use-intl";

import type { Replay, ReplayPlayer } from "@/api/replays";
import { Tooltip } from "@/ui";
import { HeroPortrait } from "../../hero-portrait";

import styles from "./styles.module.css";

export interface TeamsProps {
    replay: Replay;
    className?: string;
}

export function Teams({ replay, className }: TeamsProps) {
    const t = useTranslations("replayRow");
    const allyTeam = replay.players.find(
        (player) => player.playerId === replay.ownerPlayerId,
    )?.team;
    const allies = replay.players.filter((player) => player.team === allyTeam);
    const enemies = replay.players.filter((player) => player.team !== allyTeam);

    const renderPlayer = (player: ReplayPlayer) => (
        <Tooltip
            key={player.playerId}
            content={t("teamsPlayer", {
                player: player.name,
                hero: player.heroName,
            })}
        >
            <HeroPortrait
                size="xs"
                name={player.heroName}
                portrait={player.heroPortrait}
                decoding="sync"
                className={classNames(
                    styles.portrait,
                    player.team === allyTeam ? styles.ally : styles.enemy,
                )}
            />
        </Tooltip>
    );

    return (
        <span className={classNames(className, styles.root)}>
            <span className={styles.team}>{allies.map(renderPlayer)}</span>
            <Swords className={styles.vs} aria-hidden />
            <span className={styles.team}>{enemies.map(renderPlayer)}</span>
        </span>
    );
}
