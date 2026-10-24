import { BAND_Y, CAMP_Y, TICK_Y } from "./constants";
import { isBandMarker } from "./markers";
import type { Marker, TickMarker } from "./types";

const TICK_MERGE_PX = 6;
const MARK_STEP_PX = 14;

const FIGHT_MIN = 24;
const FIGHT_MAX = 42;

export const fightSize = (participants: number) =>
    FIGHT_MIN +
    ((Math.min(Math.max(participants, 2), 10) - 2) / 8) *
        (FIGHT_MAX - FIGHT_MIN);

export interface Placed {
    marker: Marker;
    y: number;
}

/**
 * Lays visible markers out at `width` px: ticks too close on one side merge into
 * one dot, and marks too close in one band step away from the axis.
 */
export function layout(markers: Marker[], width: number, duration: number) {
    const x = (time: number) => (time / duration) * width;
    const placed: Placed[] = [];
    const lastTick = new Map<string, { x: number; marker: TickMarker }>();
    const lastMark = new Map<string, { x: number; step: number }>();

    for (const marker of markers) {
        if (marker.shape === "spawn") {
            placed.push({ marker, y: 0 });
            continue;
        }

        if (!isBandMarker(marker)) {
            const y =
                marker.side === null
                    ? 0
                    : marker.entries.every((entry) => entry.type === "camp")
                      ? CAMP_Y
                      : TICK_Y;
            const lane = `${marker.side}:${y}`;
            const previous = lastTick.get(lane);

            if (
                width > 0 &&
                previous &&
                x(marker.time) - previous.x < TICK_MERGE_PX
            ) {
                const merged: TickMarker = {
                    ...previous.marker,
                    id: `${previous.marker.id}+${marker.id}`,
                    shape: "dot",
                    merged: true,
                    entries: [...previous.marker.entries, ...marker.entries],
                };
                placed[placed.findIndex((p) => p.marker === previous.marker)] =
                    {
                        marker: merged,
                        y,
                    };
                lastTick.set(lane, { x: previous.x, marker: merged });
                continue;
            }
            placed.push({ marker, y });
            lastTick.set(lane, { x: x(marker.time), marker });
            continue;
        }

        if (marker.side === null) {
            placed.push({ marker, y: 0 });
            continue;
        }

        const band = BAND_Y[marker.shape];
        const key = `${band}:${marker.side}`;
        const previous = lastMark.get(key);
        const step =
            width > 0 && previous && x(marker.time) - previous.x < MARK_STEP_PX
                ? previous.step + 1
                : 0;
        lastMark.set(key, { x: x(marker.time), step });

        placed.push({ marker, y: band + step * MARK_STEP_PX });
    }

    return placed;
}

/**
 * Times for the labels under the track: every 1, 2 or 5 minutes as games get
 * longer, then the end. A regular label within a third of a step of the end is
 * dropped so the two don't overlap.
 */
export function axisTimes(duration: number) {
    const step = duration < 8 * 60 ? 60 : duration <= 20 * 60 ? 120 : 300;
    const ticks = [];

    for (let time = 0; time < duration - step / 3; time += step) {
        ticks.push(time);
    }

    ticks.push(duration);
    return ticks;
}

export const position = (time: number, duration: number) =>
    `${Math.min(Math.max(time / duration, 0), 1) * 100}%`;
