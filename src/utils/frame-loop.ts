/** Called with the time since the last frame, in seconds. */
export type Tick = (delta: number) => void;

const FRAME_MS = 1000 / 30;
// A display frame landing a hair early still counts, or 60Hz would drop to 20fps.
const EARLY_MS = 2;
// A frame after a stall moves no further than this, so nothing jumps.
const MAX_DELTA_MS = 100;

const ticks = new Set<Tick>();

let frame = 0;
let last = 0;

function run(timestamp: number) {
    frame = requestAnimationFrame(run);

    const elapsed = timestamp - last;
    if (elapsed < FRAME_MS - EARLY_MS) return;

    last = timestamp;

    const delta = Math.min(elapsed, MAX_DELTA_MS) / 1000;
    ticks.forEach((tick) => tick(delta));
}

function sync() {
    const running = ticks.size > 0 && !document.hidden;

    if (running && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(run);
    } else if (!running && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
    }
}

document.addEventListener("visibilitychange", sync);

/** Runs `tick` on the one loop its users share, until the returned function is called. */
export function subscribe(tick: Tick) {
    ticks.add(tick);
    sync();

    return () => {
        ticks.delete(tick);
        sync();
    };
}
