import type { StandoutHighlight } from "@/api/replays";
import type { Marker } from "../types";

export type {
    Standout,
    StandoutFigure,
    StandoutHighlight,
    StandoutId,
    StandoutsResult,
    StandoutTone,
} from "@/api/replays";

/**
 * Ids of the markers `highlight` lights up: any whose entries carry one of its
 * event times, or a fight or kill marker at one of its fight starts. Times are
 * compared exactly, as both sides read the same event rows.
 */
export function litMarkers(
    markers: Marker[],
    highlight: StandoutHighlight,
): Set<string> {
    const has = (times: number[] | undefined, time: number) =>
        times?.includes(time) ?? false;
    const lit = new Set<string>();
    for (const marker of markers) {
        const fight =
            (marker.shape === "fight" || marker.shape === "kill") &&
            has(highlight.fights, marker.time);
        const entry = marker.entries.some((entry) =>
            entry.type === "death"
                ? has(highlight.deaths, entry.time)
                : entry.type === "structure"
                  ? has(highlight.structures, entry.time)
                  : entry.type === "camp"
                    ? has(highlight.camps, entry.time)
                    : has(highlight.objectives, entry.time),
        );
        if (fight || entry) lit.add(marker.id);
    }
    return lit;
}
