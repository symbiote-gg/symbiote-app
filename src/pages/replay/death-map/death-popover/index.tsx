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

import type { TimelineText } from "@/hooks/useTimelineText";
import { Popover } from "@/ui";
import type { Roster } from "@/utils/timeline/roster";
import type { PlacedDeath } from "../deaths";
import { Killers } from "./killers";

import styles from "./styles.module.css";

const CLOSE_DELAY_MS = 200;

interface AnchoredPopoverProps {
    death: PlacedDeath;
    container: RefObject<HTMLElement | null>;
    roster: Roster;
    text: TimelineText;
    onPointerEnter: () => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
}

function AnchoredPopover({
    death: { id, entry },
    container,
    roster,
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
            anchor={anchor}
            placement={entry.side === "ally" ? "top" : "bottom"}
            role="dialog"
            aria-label={text.entryLabel(entry)}
            className={styles.root}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <Killers death={entry} roster={roster} text={text} />
        </Popover>
    );
}

export interface DeathPopoverHandle {
    hover: (id: number) => void;
    leave: () => void;
}

interface DeathPopoverProps {
    ref: Ref<DeathPopoverHandle>;
    deaths: PlacedDeath[];
    container: RefObject<HTMLElement | null>;
    roster: Roster;
    text: TimelineText;
}

export function DeathPopover({
    ref,
    deaths,
    container,
    roster,
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

    const death = deaths.find(({ id }) => id === hoveredId);

    if (!death) return null;

    return (
        <AnchoredPopover
            key={death.id}
            death={death}
            container={container}
            roster={roster}
            text={text}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
        />
    );
}
