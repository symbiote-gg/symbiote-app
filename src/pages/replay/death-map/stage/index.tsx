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

interface StageProps {
    render: MinimapLayer;
    cores: { team: number; x: number; y: number }[];
    deaths: PlacedDeath[];
    time: number;
    selectedId: number | null;
    allyTeam: number;
    roster: Roster;
    text: TimelineText;
    pinsRef: RefObject<HTMLDivElement | null>;
    onPinEnter: (e: SyntheticEvent<HTMLButtonElement>) => void;
    onPinLeave: () => void;
    onPinClick: (e: MouseEvent<HTMLButtonElement>) => void;
    children?: ReactNode;
}

export function Stage({
    render,
    cores,
    deaths,
    time,
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
    return (
        <div
            className={styles.root}
            style={
                { "--aspect": render.width / render.height } as CSSProperties
            }
        >
            <div className={styles.stage}>
                <div className={styles.map}>
                    <img
                        src={render.src}
                        alt=""
                        draggable={false}
                        className={styles.render}
                    />

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
                                faded={death.entry.time > time}
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
