import {
    type PointerEvent,
    type Ref,
    type RefObject,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import type { ReplayPlayerDetail } from "@/api/replays";
import type { TimelineText } from "@/hooks/useTimelineText";
import type { KillMarker } from "@/utils/timeline/types";
import { Popover } from "../timeline/popover";
import type { PlacedDeath } from "./deaths";

const CLOSE_DELAY_MS = 200;

interface AnchoredPopoverProps {
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

function AnchoredPopover({
    id,
    marker,
    container,
    players,
    allyTeam,
    highlightSlot,
    text,
    onPointerEnter,
    onPointerLeave,
}: AnchoredPopoverProps) {
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

export interface DeathPopoverHandle {
    hover: (id: number) => void;
    leave: () => void;
}

interface DeathPopoverProps {
    ref: Ref<DeathPopoverHandle>;
    deaths: PlacedDeath[];
    markers: Map<number, KillMarker>;
    selectedId: number | null;
    container: RefObject<HTMLElement | null>;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    highlightSlot: number;
    text: TimelineText;
}

export function DeathPopover({
    ref,
    deaths,
    markers,
    selectedId,
    container,
    players,
    allyTeam,
    highlightSlot,
    text,
}: DeathPopoverProps) {
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const closeTimer = useRef<number | undefined>(undefined);

    const cancelClose = () => window.clearTimeout(closeTimer.current);

    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(
            () => setHoveredId(null),
            CLOSE_DELAY_MS,
        );
    };

    useEffect(() => cancelClose, []);

    useImperativeHandle(
        ref,
        () => ({
            hover: (id) => {
                cancelClose();
                setHoveredId(id);
            },
            leave: scheduleClose,
        }),
        [],
    );

    const shownId = hoveredId ?? selectedId;
    const death = deaths.find(({ id }) => id === shownId);
    const marker = death && markers.get(death.id);

    if (!death || !marker) return null;

    return (
        <AnchoredPopover
            key={death.id}
            id={death.id}
            marker={marker}
            container={container}
            players={players}
            allyTeam={allyTeam}
            highlightSlot={highlightSlot}
            text={text}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
        />
    );
}
