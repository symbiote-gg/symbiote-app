import classNames from "classnames";
import type { MouseEvent } from "react";

import type { TimelineText } from "@/hooks/useTimelineText";
import { position } from "@/utils/timeline/layout";
import type { PlacedDeath } from "../deaths";

import styles from "./styles.module.css";

interface TickProps {
    death: PlacedDeath;
    ally: boolean;
    mine: boolean;
    selected: boolean;
    outside: boolean;
    duration: number;
    text: TimelineText;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

function Tick({
    death: { id, entry },
    ally,
    mine,
    selected,
    outside,
    duration,
    text,
    onClick,
}: TickProps) {
    return (
        <button
            type="button"
            tabIndex={-1}
            data-death={id}
            aria-label={text.entryLabel(entry)}
            className={classNames(
                styles.tick,
                ally ? styles.ally : styles.enemy,
                {
                    [styles.mine]: mine,
                    [styles.selected]: selected,
                    [styles.outside]: outside,
                },
            )}
            style={{ left: position(entry.time, duration) }}
            onClick={onClick}
        >
            <span className={styles.mark} />
        </button>
    );
}

interface TicksProps {
    deaths: PlacedDeath[];
    reached: number;
    duration: number;
    selectedId: number | null;
    allyTeam: number;
    ownerSlot: number;
    text: TimelineText;
    onTickClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function Ticks({
    deaths,
    reached,
    duration,
    selectedId,
    allyTeam,
    ownerSlot,
    text,
    onTickClick,
}: TicksProps) {
    return deaths.map((death) => (
        <Tick
            key={death.id}
            death={death}
            ally={death.entry.team === allyTeam}
            mine={death.entry.victim === ownerSlot}
            selected={death.id === selectedId}
            outside={death.entry.time > reached}
            duration={duration}
            text={text}
            onClick={onTickClick}
        />
    ));
}
