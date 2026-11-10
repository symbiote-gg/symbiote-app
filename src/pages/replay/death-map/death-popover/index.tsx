import {
    type PointerEvent,
    type Ref,
    useEffect,
    useImperativeHandle,
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
    anchor: HTMLElement;
    roster: Roster;
    text: TimelineText;
    onPointerEnter: () => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
}

function AnchoredPopover({
    death: { entry },
    anchor,
    roster,
    text,
    onPointerEnter,
    onPointerLeave,
}: AnchoredPopoverProps) {
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
    hover: (id: number, anchor: HTMLElement) => void;
    leave: () => void;
}

interface Hovered {
    id: number;
    anchor: HTMLElement;
}

interface DeathPopoverProps {
    ref: Ref<DeathPopoverHandle>;
    deaths: PlacedDeath[];
    roster: Roster;
    text: TimelineText;
}

export function DeathPopover({ ref, deaths, roster, text }: DeathPopoverProps) {
    const [hovered, setHovered] = useState<Hovered | null>(null);
    const closeTimer = useRef<number | undefined>(undefined);

    const cancelClose = () => window.clearTimeout(closeTimer.current);

    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(
            () => setHovered(null),
            CLOSE_DELAY_MS,
        );
    };

    useEffect(() => cancelClose, []);

    useImperativeHandle(
        ref,
        () => ({
            hover: (id, anchor) => {
                cancelClose();
                setHovered({ id, anchor });
            },
            leave: scheduleClose,
        }),
        [],
    );

    const death = deaths.find(({ id }) => id === hovered?.id);

    if (!hovered || !death) return null;

    return (
        <AnchoredPopover
            key={death.id}
            death={death}
            anchor={hovered.anchor}
            roster={roster}
            text={text}
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
        />
    );
}
