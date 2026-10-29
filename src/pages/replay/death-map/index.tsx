import { MapPin } from "lucide-react";
import {
    type ChangeEvent,
    type MouseEvent,
    type SyntheticEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import type {
    ReplayPlayerDetail,
    Timeline as TimelineData,
} from "@/api/replays";
import { useTimelineText } from "@/hooks/useTimelineText";
import { Card, CardHeader } from "@/ui";
import { coresOf } from "@/utils/timeline/cores";
import { deathEntries, deathMarkers } from "@/utils/timeline/markers";
import { layerOf, minimapOf, project } from "@/utils/timeline/minimaps";
import type { Roster } from "@/utils/timeline/roster";
import { Controls } from "./controls";
import { DeathList } from "./death-list";
import { DeathPopover } from "./death-popover";
import { type DeathFilter, type PlacedDeath, matches } from "./deaths";
import { Scrubber } from "./scrubber";
import { Stage } from "./stage";

import styles from "./styles.module.css";

const CLOSE_DELAY_MS = 200;

interface DeathMapProps {
    map: string;
    timeline: TimelineData;
    duration: number;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    ownerSlot: number;
}

export function DeathMap({
    map,
    timeline,
    duration,
    players,
    allyTeam,
    ownerSlot,
}: DeathMapProps) {
    const t = useTranslations("replay.deathMap");
    const text = useTimelineText(players);
    const [time, setTime] = useState(duration);
    const [layer, setLayer] = useState("0");
    const [filter, setFilter] = useState<DeathFilter>("all");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const closeTimer = useRef<number | undefined>(undefined);
    const pinsRef = useRef<HTMLDivElement>(null);

    const layers = minimapOf(map);
    const markers = useMemo(
        () => deathMarkers(timeline, allyTeam),
        [timeline, allyTeam],
    );
    const placed = useMemo(() => {
        if (!layers) return [];

        return deathEntries(timeline, allyTeam).flatMap(
            (entry, id): PlacedDeath[] => {
                if (entry.x === null || entry.y === null) return [];

                const layer = layerOf(layers, entry.x, entry.y);
                const at = project(layers[layer], entry.x, entry.y);
                return [{ id, entry, layer, at }];
            },
        );
    }, [layers, timeline, allyTeam]);

    const cancelClose = () => window.clearTimeout(closeTimer.current);

    useEffect(() => cancelClose, []);

    useEffect(() => {
        if (selectedId === null) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedId(null);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [selectedId]);

    if (!layers || placed.length === 0) return null;

    const roster: Roster = { players, allyTeam, highlightSlot: ownerSlot };
    const shown = Number(layer);
    const render = layers[shown];

    const isShown = (death: PlacedDeath) =>
        matches(filter, death.entry, allyTeam, ownerSlot);
    const counts: Record<DeathFilter, number> = {
        all: placed.length,
        team: placed.filter(({ entry }) => entry.team === allyTeam).length,
        you: placed.filter(({ entry }) => entry.victim === ownerSlot).length,
        enemy: placed.filter(({ entry }) => entry.team !== allyTeam).length,
    };

    const filtered = placed.filter(isShown);
    const onLayer = (index: number) =>
        filtered.filter(
            (death) => death.layer === index && death.entry.time <= time,
        );
    const visible = onLayer(shown);
    const cores = coresOf(map).filter(
        ({ x, y }) => layerOf(layers, x, y) === shown,
    );

    const byId = new Map(placed.map((death) => [death.id, death]));
    const popoverId = hoveredId ?? selectedId;
    const popover = visible.find((death) => death.id === popoverId);
    const popoverMarker = popover && markers.get(popover.id);

    const select = (id: number) => {
        const death = byId.get(id);
        if (!death || id === selectedId) {
            setSelectedId(null);
            return;
        }

        setSelectedId(id);
        setLayer(String(death.layer));
        if (death.entry.time > time) setTime(death.entry.time);
    };

    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = window.setTimeout(
            () => setHoveredId(null),
            CLOSE_DELAY_MS,
        );
    };

    const onPinEnter = (e: SyntheticEvent<HTMLButtonElement>) => {
        cancelClose();
        setHoveredId(Number(e.currentTarget.dataset.death));
    };

    const onPinClick = (e: MouseEvent<HTMLButtonElement>) =>
        select(Number(e.currentTarget.dataset.death));

    const onFilter = (next: DeathFilter) => {
        setFilter(next);

        const selected = selectedId === null ? null : byId.get(selectedId);
        if (selected && !matches(next, selected.entry, allyTeam, ownerSlot)) {
            setSelectedId(null);
        }
    };

    const onLayerChange = (index: number) => setLayer(String(index));

    const onScrub = (e: ChangeEvent<HTMLInputElement>) =>
        setTime(Number(e.target.value));

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={MapPin}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
                action={
                    <Controls
                        layerCount={layers.length}
                        layer={shown}
                        counts={counts}
                        filter={filter}
                        onLayer={onLayerChange}
                        onFilter={onFilter}
                    />
                }
            />
            <div className={styles.body}>
                <Scrubber
                    deaths={filtered}
                    time={time}
                    duration={duration}
                    selectedId={selectedId}
                    allyTeam={allyTeam}
                    text={text}
                    onTickClick={onPinClick}
                    onScrub={onScrub}
                />

                <Stage
                    render={render}
                    cores={cores}
                    deaths={visible}
                    time={time}
                    duration={duration}
                    selectedId={selectedId}
                    allyTeam={allyTeam}
                    roster={roster}
                    text={text}
                    pinsRef={pinsRef}
                    onPinEnter={onPinEnter}
                    onPinLeave={scheduleClose}
                    onPinClick={onPinClick}
                >
                    {popover && popoverMarker && (
                        <DeathPopover
                            key={popover.id}
                            id={popover.id}
                            marker={popoverMarker}
                            container={pinsRef}
                            players={players}
                            allyTeam={allyTeam}
                            highlightSlot={ownerSlot}
                            text={text}
                            onPointerEnter={cancelClose}
                            onPointerLeave={scheduleClose}
                        />
                    )}
                </Stage>

                <div className={styles.side}>
                    <div className={styles.sideInner}>
                        <DeathList
                            deaths={filtered}
                            time={time}
                            selectedId={selectedId}
                            roster={roster}
                            text={text}
                            onSelect={select}
                        />
                    </div>
                </div>
            </div>
        </Card>
    );
}
