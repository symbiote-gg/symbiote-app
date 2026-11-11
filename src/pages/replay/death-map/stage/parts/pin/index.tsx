import classNames from "classnames";
import { type MouseEvent, type SyntheticEvent, useEffect, useRef } from "react";

import { TeamPortrait } from "@/components/team-portrait";
import type { TimelineText } from "@/hooks/useTimelineText";
import { reducedMotion } from "@/utils/motion";
import type { Roster } from "@/utils/timeline/roster";
import type { PlacedDeath } from "../../../deaths";
import { land, lift } from "./land";

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
    const ref = useRef<HTMLButtonElement>(null);
    const wasFaded = useRef(faded);

    // Lands as the scrubber reaches it and lifts as it backs away; never on mount.
    useEffect(() => {
        const changed = wasFaded.current !== faded;
        wasFaded.current = faded;

        if (!changed || !ref.current || reducedMotion()) return;

        const tween = faded ? lift(ref.current) : land(ref.current);
        tween.play();

        return tween.cancel;
    }, [faded]);

    return (
        <button
            ref={ref}
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
            <TeamPortrait slot={entry.victim} size="sm" roster={roster} />
        </button>
    );
}
