import classNames from "classnames";
import { type PointerEvent, useLayoutEffect, useState } from "react";

import type { ReplayPlayerDetail } from "@/api/replays";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Popover as PopoverSurface } from "@/ui";
import { markerView } from "@/utils/timeline/markers";
import type { Marker, Side } from "@/utils/timeline/types";
import { Body } from "./body";
import { Header } from "./header";

import styles from "./styles.module.css";

interface PopoverProps {
    marker: Marker;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    highlightSlot: number | null;
    text: TimelineText;
    track: HTMLElement | null;
    side: Side;
    onPointerEnter: () => void;
    onPointerLeave: (e: PointerEvent<HTMLElement>) => void;
}

export function Popover({
    marker,
    players,
    allyTeam,
    highlightSlot,
    text,
    track,
    side,
    onPointerEnter,
    onPointerLeave,
}: PopoverProps) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    useLayoutEffect(() => {
        setAnchor(
            track?.querySelector<HTMLElement>(
                `[data-id="${CSS.escape(marker.id)}"]`,
            ) ?? null,
        );
    }, [track, marker.id]);

    const view = markerView(marker);
    const roster = { players, allyTeam, highlightSlot };

    return (
        <PopoverSurface
            anchor={anchor}
            placement={
                side === "ally" ? "top" : side === "enemy" ? "bottom" : "left"
            }
            role="dialog"
            aria-label={text.markerLabel(marker)}
            className={classNames({
                [styles.popoverKills]:
                    view.kills ||
                    view.structure ||
                    view.camp ||
                    view.group ||
                    view.map,
            })}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <Header marker={marker} view={view} text={text} />
            <Body marker={marker} view={view} roster={roster} text={text} />
        </PopoverSurface>
    );
}
