import {
    type PointerEvent,
    type RefObject,
    useLayoutEffect,
    useState,
} from "react";

import type { ReplayPlayerDetail } from "@/api/replays";
import type { TimelineText } from "@/hooks/useTimelineText";
import type { KillMarker } from "@/utils/timeline/types";
import { Popover } from "../timeline/popover";

interface DeathPopoverProps {
    id: number;
    marker: KillMarker;
    container: RefObject<HTMLElement | null>;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    highlightSlot: number;
    text: TimelineText;
    onPointerEnter: () => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
}

export function DeathPopover({
    id,
    marker,
    container,
    players,
    allyTeam,
    highlightSlot,
    text,
    onPointerEnter,
    onPointerLeave,
}: DeathPopoverProps) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    useLayoutEffect(() => {
        setAnchor(
            container.current?.querySelector<HTMLElement>(
                `[data-death="${id}"]`,
            ) ?? null,
        );
    }, [container, id]);

    return (
        <Popover
            marker={marker}
            players={players}
            allyTeam={allyTeam}
            highlightSlot={highlightSlot}
            text={text}
            track={null}
            anchor={anchor}
            side={marker.side}
            result={false}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        />
    );
}
