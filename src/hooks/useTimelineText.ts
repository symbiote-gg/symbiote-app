import { useTranslations } from "use-intl";

import type { ReplayPlayerDetail } from "@/api/replays";
import { formatDuration } from "@/utils/dates";
import { humanize, specLabel } from "@/utils/timeline/map-events";
import type {
    Entry,
    MapEntry,
    Marker,
    ObjectiveMarker,
} from "@/utils/timeline/types";

export function useTimelineText(players: ReplayPlayerDetail[]) {
    const t = useTranslations("replay.timeline");

    const heroOf = (slot: number) =>
        players.find((p) => p.slot === slot)?.heroName ?? "?";

    const at = (time: number) => formatDuration(Math.round(time));

    const mapLabel = ({ spec, objective }: MapEntry) =>
        spec
            ? t(`objective.${specLabel(spec, objective.variant)}`)
            : humanize(objective.kind);

    const entryText = (entry: Entry) => {
        switch (entry.type) {
            case "death": {
                const victim = heroOf(entry.victim);
                return entry.killers.length > 0
                    ? t("death", {
                          victim,
                          killers: entry.killers.map(heroOf).join(", "),
                      })
                    : t("deathNoKiller", { victim });
            }
            case "camp":
                return entry.campType
                    ? t("camp", { camp: entry.campType })
                    : t("campUnknown");
            case "structure":
                return entry.keep ? t("keep") : t("fort");
            case "map":
                return mapLabel(entry);
        }
    };

    const entryLabel = (entry: Entry) =>
        t("at", { time: at(entry.time), label: entryText(entry) });

    const objectiveLabel = (marker: ObjectiveMarker) =>
        marker.label ? t(`objective.${marker.label}`) : humanize(marker.kind);

    const markerText = (marker: Marker) => {
        switch (marker.shape) {
            case "fight":
                return t("fight", {
                    ally: marker.score[0],
                    enemy: marker.score[1],
                });
            case "objective": {
                const label = objectiveLabel(marker);
                return marker.count > 1
                    ? t("objectiveCount", { label, count: marker.count })
                    : label;
            }
            default:
                return marker.entries.length > 1
                    ? t("events", { count: marker.entries.length })
                    : entryText(marker.entries[0]);
        }
    };

    const markerLabel = (marker: Marker) =>
        t("at", { time: at(marker.time), label: markerText(marker) });

    return {
        at,
        heroOf,
        entryText,
        entryLabel,
        markerText,
        markerLabel,
        objectiveLabel,
    };
}

export type TimelineText = ReturnType<typeof useTimelineText>;
