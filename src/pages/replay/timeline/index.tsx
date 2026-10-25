import { Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";

import type {
    ReplayPlayerDetail,
    Timeline as TimelineData,
} from "@/api/replays";
import { useHiddenFilters } from "@/hooks/useHiddenFilters";
import { useMeFilter } from "@/hooks/useMeFilter";
import { useTimelineText } from "@/hooks/useTimelineText";
import { Card, CardHeader } from "@/ui";
import { FILTERS, type Filter } from "@/utils/timeline/filters";
import { levelCurves } from "@/utils/timeline/levels";
import { buildMarkers, involves } from "@/utils/timeline/markers";
import type { Marker } from "@/utils/timeline/types";
import { Filters } from "./filters";
import { Track } from "./track";

import styles from "./styles.module.css";

interface TimelineProps {
    timeline: TimelineData;
    duration: number;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    ownerSlot: number;
    ownerWin: boolean | null;
}

export function Timeline({
    timeline,
    duration,
    players,
    allyTeam,
    ownerSlot,
    ownerWin,
}: TimelineProps) {
    const t = useTranslations("replay.timeline");
    const text = useTimelineText(players);
    const [hidden, toggle] = useHiddenFilters();
    const [me, toggleMe] = useMeFilter();
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [selected, setSelected] = useState<Marker | null>(null);

    const markers = useMemo(
        () => buildMarkers(timeline, allyTeam),
        [timeline, allyTeam],
    );
    const curves = useMemo(
        () => levelCurves(timeline.levels, allyTeam),
        [timeline.levels, allyTeam],
    );

    const counts = useMemo(() => {
        const counts: Record<Filter, number> = {
            fights: 0,
            objectives: 0,
            structures: 0,
            camps: 0,
        };
        for (const marker of markers) counts[marker.filter]++;
        return counts;
    }, [markers]);

    const disabled = new Set<Filter>(
        markers.some((marker) => marker.filter === "objectives")
            ? []
            : ["objectives"],
    );
    const shown = (filter: Filter) =>
        !hidden.has(filter) && !disabled.has(filter);
    const visible = markers.filter((marker) => shown(marker.filter));
    const meCount = markers.filter((marker) =>
        involves(marker, ownerSlot),
    ).length;

    useEffect(() => {
        if (!selected) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelected(null);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [selected]);

    const onToggle = (filter: Filter) => {
        toggle(filter);
        if (selected?.filter === filter) setSelected(null);
    };

    return (
        <Card className={styles.timeline}>
            <CardHeader
                icon={Clock}
                size="sm"
                title={t("title")}
                action={
                    <Filters
                        hidden={hidden}
                        disabled={disabled}
                        counts={counts}
                        me={me}
                        meCount={meCount}
                        onToggle={onToggle}
                        onToggleMe={toggleMe}
                    />
                }
            />
            <div className={styles.body}>
                <Track
                    markers={visible}
                    curves={curves}
                    duration={duration}
                    players={players}
                    allyTeam={allyTeam}
                    highlightSlot={me ? ownerSlot : null}
                    winner={
                        ownerWin === null ? null : ownerWin ? "ally" : "enemy"
                    }
                    text={text}
                    hoverTime={hoverTime}
                    selectedId={selected?.id ?? null}
                    empty={FILTERS.every((filter) => !shown(filter))}
                    onHover={setHoverTime}
                    onSelect={setSelected}
                />
            </div>
        </Card>
    );
}
