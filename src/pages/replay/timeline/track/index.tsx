import classNames from "classnames";
import {
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
    type PointerEvent,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import {
    AXIS,
    AXIS_GAP,
    CAMP_Y,
    TRACK_HEIGHT,
} from "@/utils/timeline/constants";
import { type Placed, layout, position } from "@/utils/timeline/layout";
import type { LevelCurve } from "@/utils/timeline/levels";
import { LONG_GAME } from "@/utils/timeline/markers";
import { involves, isBandMarker } from "@/utils/timeline/markers";
import type { Marker, Side } from "@/utils/timeline/types";
import { Popover } from "../popover";
import { sideClass } from "../side";
import { AxisTimes } from "./parts/axis-times";
import { type Bookend, Bookends } from "./parts/bookends";
import { Cursor } from "./parts/cursor";
import { Lead } from "./parts/lead";
import { MarkerButton } from "./parts/marker-button";
import { Tiers } from "./parts/tiers";

import styles from "./styles.module.css";

const DRAG_PX = 8;
const CLOSE_DELAY_MS = 200;

function useElementWidth(ref: RefObject<HTMLElement | null>) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
    return width;
}

interface TrackProps {
    markers: Marker[];
    curves: [LevelCurve, LevelCurve];
    duration: number;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    /** Ring this player's markers and dim the rest; null leaves all as is. */
    highlightSlot: number | null;
    winner: Side;
    text: TimelineText;
    hoverTime: number | null;
    selectedId: string | null;
    empty: boolean;
    onHover: (time: number | null) => void;
    onSelect: (marker: Marker | null) => void;
}

export function Track({
    markers,
    curves,
    duration,
    players,
    allyTeam,
    highlightSlot,
    winner,
    text,
    hoverTime,
    selectedId,
    empty,
    onHover,
    onSelect,
}: TrackProps) {
    const t = useTranslations("replay.timeline");
    const ref = useRef<HTMLDivElement>(null);
    const width = useElementWidth(ref);
    const pointer = useRef({ x: 0, dragged: false });
    const closeTimer = useRef<number | undefined>(undefined);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [bookend, setBookend] = useState<Bookend | null>(null);

    const placed = layout(markers, width, duration);
    const byId = new Map(placed.map((p) => [p.marker.id, p]));
    const active = byId.has(activeId ?? "") ? activeId : placed[0]?.marker.id;
    const selected = selectedId ? byId.get(selectedId) : undefined;

    const top = ({ marker, y }: Placed) =>
        marker.side === "ally"
            ? AXIS - y
            : marker.side === "enemy"
              ? AXIS + y
              : AXIS;

    const longGame = duration > LONG_GAME;

    const mine = (marker: Marker) =>
        highlightSlot !== null && involves(marker, highlightSlot);
    const dimmed = (marker: Marker) => highlightSlot !== null && !mine(marker);

    const find = (id: string | undefined) =>
        id ? (byId.get(id)?.marker ?? null) : null;

    const focus = (id: string) => {
        setActiveId(id);
        ref.current
            ?.querySelector<HTMLButtonElement>(`[data-id="${CSS.escape(id)}"]`)
            ?.focus();
    };

    const timeAt = (clientX: number) => {
        const rect = ref.current!.getBoundingClientRect();
        return (
            Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) *
            duration
        );
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        pointer.current = { x: e.clientX, dragged: false };
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (
            e.buttons !== 0 &&
            Math.abs(e.clientX - pointer.current.x) > DRAG_PX
        ) {
            pointer.current.dragged = true;
        }
        onHover(timeAt(e.clientX));
    };

    const onPointerLeave = () => onHover(null);

    const cancelClose = () => window.clearTimeout(closeTimer.current);

    useEffect(() => cancelClose, []);

    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => {
            onSelect(null);
            setBookend(null);
        }, CLOSE_DELAY_MS);
    };

    const onMarkerEnter = (e: PointerEvent<HTMLButtonElement>) => {
        cancelClose();
        setBookend(null);
        const marker = find(e.currentTarget.dataset.id);
        if (marker) onSelect(marker);
    };

    const onBookendEnter = (e: PointerEvent<HTMLButtonElement>) => {
        cancelClose();
        onSelect(null);
        setBookend(e.currentTarget.dataset.bookend as Bookend);
    };

    // A mouse click lands on a marker hover already opened, so only keyboard
    // (detail 0) clicks toggle.
    const onMarkerClick = (e: MouseEvent<HTMLButtonElement>) => {
        if (pointer.current.dragged) return;
        cancelClose();
        const marker = find(e.currentTarget.dataset.id);
        const toggles = e.detail === 0;
        onSelect(
            marker && (!toggles || marker.id !== selectedId) ? marker : null,
        );
    };

    const onMarkerFocus = (e: FocusEvent<HTMLButtonElement>) =>
        setActiveId(e.currentTarget.dataset.id ?? null);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (placed.length === 0) return;
        const index = placed.findIndex((p) => p.marker.id === active);
        const next = {
            ArrowRight: Math.min(index + 1, placed.length - 1),
            ArrowLeft: Math.max(index - 1, 0),
            Home: 0,
            End: placed.length - 1,
        }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        focus(placed[next].marker.id);
    };

    return (
        <>
            <div
                ref={ref}
                className={styles.track}
                style={{ height: TRACK_HEIGHT }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                onKeyDown={onKeyDown}
            >
                <Lead curves={curves} duration={duration} />
                <Bookends
                    winner={winner}
                    duration={duration}
                    text={text}
                    open={bookend}
                    onPointerEnter={onBookendEnter}
                    onPointerLeave={scheduleClose}
                    onPopoverEnter={cancelClose}
                />
                <Tiers curves={curves} duration={duration} />
                {placed.map((p) =>
                    p.marker.side !== null &&
                    (isBandMarker(p.marker) || p.y === CAMP_Y) ? (
                        <span
                            key={`stem-${p.marker.id}`}
                            className={classNames(
                                styles.stem,
                                sideClass(p.marker.side),
                                { [styles.dimmed]: dimmed(p.marker) },
                            )}
                            style={{
                                left: position(p.marker.time, duration),
                                top:
                                    p.marker.side === "ally"
                                        ? AXIS - p.y
                                        : AXIS + AXIS_GAP,
                                height: p.y - AXIS_GAP,
                            }}
                        />
                    ) : null,
                )}
                {placed.map((p) => (
                    <MarkerButton
                        key={p.marker.id}
                        marker={p.marker}
                        top={top(p)}
                        duration={duration}
                        longGame={longGame}
                        text={text}
                        tabbable={p.marker.id === active}
                        selected={p.marker.id === selectedId}
                        mine={mine(p.marker)}
                        dimmed={dimmed(p.marker)}
                        onClick={onMarkerClick}
                        onPointerEnter={onMarkerEnter}
                        onPointerLeave={scheduleClose}
                        onFocus={onMarkerFocus}
                    />
                ))}
                {empty && (
                    <Typography
                        size="sm"
                        variant="tertiary"
                        className={styles.empty}
                    >
                        {t("empty.filtered")}
                    </Typography>
                )}
                <Cursor time={hoverTime} duration={duration} text={text} />
                {selected && (
                    <Popover
                        key={selected.marker.id}
                        marker={selected.marker}
                        players={players}
                        allyTeam={allyTeam}
                        highlightSlot={highlightSlot}
                        text={text}
                        track={ref.current}
                        side={selected.marker.side}
                        onPointerEnter={cancelClose}
                        onPointerLeave={scheduleClose}
                    />
                )}
            </div>
            <AxisTimes duration={duration} text={text} />
        </>
    );
}
