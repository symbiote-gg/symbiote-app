import classNames from "classnames";
import type { MouseEvent, SyntheticEvent } from "react";

import { TeamPortrait } from "@/components/team-portrait";
import type { TimelineText } from "@/hooks/useTimelineText";
import type { Roster } from "@/utils/timeline/roster";
import type { PlacedDeath } from "../../../deaths";

import styles from "./styles.module.css";

interface PinProps {
    death: PlacedDeath;
    faded: boolean;
    selected: boolean;
    roster: Roster;
    text: TimelineText;
    onEnter: (e: SyntheticEvent<HTMLButtonElement>) => void;
    onLeave: () => void;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function Pin({
    death: { id, entry, at },
    faded,
    selected,
    roster,
    text,
    onEnter,
    onLeave,
    onClick,
}: PinProps) {
    return (
        <button
            type="button"
            data-death={id}
            aria-label={text.entryLabel(entry)}
            aria-pressed={selected}
            className={classNames(styles.root, {
                [styles.faded]: faded,
                [styles.selected]: selected,
            })}
            style={at}
            onPointerEnter={onEnter}
            onPointerLeave={onLeave}
            onFocus={onEnter}
            onBlur={onLeave}
            onClick={onClick}
        >
            <TeamPortrait slot={entry.victim} size="md" roster={roster} />
        </button>
    );
}
