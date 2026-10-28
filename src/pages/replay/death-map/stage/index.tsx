import type {
    CSSProperties,
    MouseEvent,
    ReactNode,
    RefObject,
    SyntheticEvent,
} from "react";

import type { TimelineText } from "@/hooks/useTimelineText";
import { type MinimapLayer, project } from "@/utils/timeline/minimaps";
import type { Roster } from "@/utils/timeline/roster";
import type { PlacedDeath } from "../deaths";
import { Core } from "./parts/core";
import { Pin } from "./parts/pin";

import styles from "./styles.module.css";

/** Deaths this recent, in game seconds, stay lit as the scrubber moves on. */
const RECENT_SECS = 30;

interface StageProps {
    render: MinimapLayer;
    /** In map units, only those on the shown layer. */
    cores: { team: number; x: number; y: number }[];
    /** Those on the shown layer, up to `time`. */
    deaths: PlacedDeath[];
    time: number;
    duration: number;
    selectedId: number | null;
    allyTeam: number;
    roster: Roster;
    text: TimelineText;
    pinsRef: RefObject<HTMLDivElement | null>;
    onPinEnter: (e: SyntheticEvent<HTMLButtonElement>) => void;
    onPinLeave: () => void;
    onPinClick: (e: MouseEvent<HTMLButtonElement>) => void;
    /** Over the map, positioned against it: the popover. */
    children?: ReactNode;
}

export function Stage({
    render,
    cores,
    deaths,
    time,
    duration,
    selectedId,
    allyTeam,
    roster,
    text,
    pinsRef,
    onPinEnter,
    onPinLeave,
    onPinClick,
    children,
}: StageProps) {
    // at the end the map is the whole game's deaths, none older than the rest
    const atEnd = time >= duration;

    return (
        <div
            className={styles.root}
            style={
                { "--aspect": render.width / render.height } as CSSProperties
            }
        >
            <div className={styles.backdrop} aria-hidden />

            <div className={styles.stage}>
                <div className={styles.map}>
                    <div className={styles.render}>
                        <img
                            src={render.src}
                            alt=""
                            draggable={false}
                            className={styles.image}
                        />
                    </div>

                    <div ref={pinsRef} className={styles.pins}>
                        {cores.map(({ team, x, y }) => (
                            <Core
                                key={team}
                                team={team}
                                allyTeam={allyTeam}
                                at={project(render, x, y)}
                            />
                        ))}
                        {deaths.map((death) => (
                            <Pin
                                key={death.id}
                                death={death}
                                faded={
                                    !atEnd &&
                                    time - death.entry.time > RECENT_SECS
                                }
                                selected={death.id === selectedId}
                                roster={roster}
                                text={text}
                                onEnter={onPinEnter}
                                onLeave={onPinLeave}
                                onClick={onPinClick}
                            />
                        ))}
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
