import { MapPin } from "lucide-react";
import {
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
import { deathEntries } from "@/utils/timeline/markers";
import { layerOf, minimapOf, project } from "@/utils/timeline/minimaps";
import type { Roster } from "@/utils/timeline/roster";
import { Controls } from "./controls";
import { DeathList } from "./death-list";
import { DeathPopover, type DeathPopoverHandle } from "./death-popover";
import {
    type DeathFilter,
    type PlacedDeath,
    deathKinds,
    matches,
    withPlayerKillers,
} from "./deaths";
import { Scrubber, type ScrubberHandle } from "./scrubber";
import { Stage } from "./stage";
import { rangeStats } from "./stats";
import { Summary } from "./summary";

import styles from "./styles.module.css";

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
    const [time, setTime] = useState(() => Math.ceil(duration));
    const [layer, setLayer] = useState("0");
    const [filter, setFilter] = useState<DeathFilter>("all");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const popoverRef = useRef<DeathPopoverHandle>(null);
    const scrubberRef = useRef<ScrubberHandle>(null);
    const pinsRef = useRef<HTMLDivElement>(null);

    const layers = minimapOf(map);
    const placed = useMemo(() => {
        if (!layers) return [];

        return deathEntries(timeline, allyTeam).flatMap(
            (entry, id): PlacedDeath[] => {
                if (entry.x === null || entry.y === null) return [];

                const layer = layerOf(layers, entry.x, entry.y);
                const at = project(layers[layer], entry.x, entry.y);
                return [
                    {
                        id,
                        entry: withPlayerKillers(entry, players),
                        layer,
                        at,
                    },
                ];
            },
        );
    }, [layers, timeline, allyTeam, players]);
    const kinds = useMemo(
        () => deathKinds(placed, timeline),
        [placed, timeline],
    );

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

    const inStretch = ({ entry }: PlacedDeath) => entry.time <= time;

    const filtered = placed.filter(isShown);
    const listed = filtered.filter(inStretch);
    const visible = filtered.filter((death) => death.layer === shown);
    const stats = rangeStats(placed.filter(inStretch), allyTeam);
    const cores = coresOf(map).filter(
        ({ x, y }) => layerOf(layers, x, y) === shown,
    );

    const byId = new Map(placed.map((death) => [death.id, death]));
    const selected = selectedId === null ? null : byId.get(selectedId);

    const select = (id: number) => {
        const death = byId.get(id);
        if (!death || id === selectedId) {
            setSelectedId(null);
            return;
        }

        const reached = Math.ceil(death.entry.time);

        setSelectedId(id);
        setLayer(String(death.layer));
        setTime((current) => Math.max(current, reached));
        scrubberRef.current?.reach(reached);
    };

    const onPinEnter = (e: SyntheticEvent<HTMLButtonElement>) =>
        popoverRef.current?.hover(
            Number(e.currentTarget.dataset.death),
            e.currentTarget,
        );

    const onPinLeave = () => popoverRef.current?.leave();

    const onPinClick = (e: MouseEvent<HTMLButtonElement>) =>
        select(Number(e.currentTarget.dataset.death));

    const onFilter = (next: DeathFilter) => {
        setFilter(next);

        if (selected && !matches(next, selected.entry, allyTeam, ownerSlot)) {
            setSelectedId(null);
        }
    };

    const onLayerChange = (index: number) => setLayer(String(index));

    const onTime = (next: number) => {
        const crossed = placed.some(
            ({ entry }) => entry.time > time !== entry.time > next,
        );
        if (!crossed) return;

        setTime(next);

        if (selected && selected.entry.time > next) setSelectedId(null);
    };

    return (
        <Card className={styles.root}>
            <CardHeader
                icon={MapPin}
                size="sm"
                title={t("title")}
                subtitle={t("subtitle")}
                divided
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
                <Stage
                    render={render}
                    cores={cores}
                    deaths={visible}
                    time={time}
                    selectedId={selectedId}
                    allyTeam={allyTeam}
                    roster={roster}
                    text={text}
                    pinsRef={pinsRef}
                    onPinEnter={onPinEnter}
                    onPinLeave={onPinLeave}
                    onPinClick={onPinClick}
                >
                    <DeathPopover
                        ref={popoverRef}
                        deaths={visible}
                        roster={roster}
                        text={text}
                    />
                </Stage>

                <div className={styles.side}>
                    <div className={styles.sideInner}>
                        <Summary stats={stats} roster={roster} />
                        <DeathList
                            deaths={listed}
                            kinds={kinds}
                            selectedId={selectedId}
                            roster={roster}
                            text={text}
                            onSelect={select}
                        />
                    </div>
                </div>

                <Scrubber
                    ref={scrubberRef}
                    deaths={filtered}
                    reached={time}
                    duration={duration}
                    selectedId={selectedId}
                    allyTeam={allyTeam}
                    ownerSlot={ownerSlot}
                    text={text}
                    onTickClick={onPinClick}
                    onTime={onTime}
                />
            </div>
        </Card>
    );
}
