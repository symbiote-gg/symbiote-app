import { ENTER_MS, REVEAL_MS, TRAVEL_MS } from "@/utils/motion";
import { TIERS, tierIndex, tierRange } from "../tiers";

/** A score with each part's points, in the order of the parts. */
export type Target = {
    score: number;
    parts: number[];
    tier?: number;
};

const ENTER = ENTER_MS / 1000;
const TRAVEL = TRAVEL_MS / 1000;
const REVEAL = REVEAL_MS / 1000;

// Seconds.
const MOVE = { base: 0.35, perPoint: 0.055 };
// The ring holds as it stood until `snap`, then as the new rank until `end`.
const CROSS = { snap: ENTER, end: 0.8 };
const BURST_SECS = REVEAL;
const SLIDE_SECS = TRAVEL;
// A rank up pops the lit pip in. A rank down swells it while the ring holds, then
// pops it out.
const PIP = { in: ENTER, out: ENTER, swellScale: 1.15 };

const SPARKS = {
    count: 10,
    life: 0.8,
    /** Units a second. */
    speed: { min: 60, max: 150 },
    gravity: 260,
    radius: 3,
};

type Step =
    | { kind: "move"; from: number; to: number; duration: number }
    | { kind: "cross"; cut: number; up: boolean; tier: number };

type Spark = {
    vx: number;
    vy: number;
};

/** A change of score playing out, moved on by `advance`. */
export type Timeline = {
    from: Target;
    to: Target;
    steps: Step[];
    index: number;
    /** Seconds into the step. */
    elapsed: number;
    snapped: boolean;
    score: number;
    tier: number;
    /** Each running effect's age in seconds, `null` when it isn't. */
    flash: number | null;
    burst: { age: number; up: boolean } | null;
    sparks: { age: number; dots: Spark[] } | null;
    slide: { age: number; up: boolean; from: number } | null;
    pip: { age: number; up: boolean; index: number } | null;
};

/** The ring at one moment. */
export type Frame = Target & {
    tier: number;
    /** Points a second the score is moving, under 0 as it falls. */
    pace: number;
    /** How much of the rank ring is filled, from 0 to 1. */
    fill: number;
    /** Building from 0 as a crossing starts up to 1 as the rank changes. */
    flash: number;
    /** How far the burst ring has gone, from 0 to 1: out on a rank up, in on a rank down. */
    burst: { up: boolean; progress: number } | null;
    /** Offsets from the far end of the ring, which they fly from on a rank up. */
    sparks: { x: number; y: number; r: number }[] | null;
    /** The name of tier `from` leaving for the current one's. */
    slide: { from: number; up: boolean; progress: number } | null;
    /** The lit pip gained or lost, still drawn while it swells and pops out. */
    pip: { index: number; scale: number } | null;
    /** Set on the one frame the rank changes. */
    crossed: { up: boolean; tier: number } | null;
    done: boolean;
};

const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

const easeIn = (progress: number) => progress ** 3;

const easeInOut = (progress: number) =>
    progress < 0.5 ? 4 * progress ** 3 : 1 - (2 - 2 * progress) ** 3 / 2;

// Overshoots by about a fifth before settling.
const easeOutBack = (progress: number) =>
    1 + 3.6 * (progress - 1) ** 3 + 2.6 * (progress - 1) ** 2;

const pipAt = ({ index, age, up }: NonNullable<Timeline["pip"]>) => ({
    index,
    scale: up
        ? easeOutBack(age / PIP.in)
        : // Shrinking from the start, so the swollen pip doesn't hang.
          PIP.swellScale * (1 - (age / PIP.out) ** 2),
});

function fillOf(score: number, tier: number) {
    const { min, max } = tierRange(tier);

    return Math.min(1, Math.max(0, (score - min) / (max - min)));
}

export function rest(target: Target): Frame {
    const tier = tierIndex(target.score);

    return {
        ...target,
        tier,
        pace: 0,
        fill: fillOf(target.score, tier),
        flash: 0,
        burst: null,
        sparks: null,
        slide: null,
        pip: null,
        crossed: null,
        done: true,
    };
}

/** Whether the timeline moves `from` to `to`, rather than the ring just resting on it. */
export function moves(from: Target, to: Target) {
    return (
        from.score !== to.score ||
        (from.tier ?? tierIndex(from.score)) !== tierIndex(to.score)
    );
}

export function createTimeline(from: Target, to: Target): Timeline {
    const fromTier = from.tier ?? tierIndex(from.score);
    const toTier = tierIndex(to.score);
    // Cut short on a cut, the ring can change tier without its score moving.
    const up = fromTier === toTier ? to.score > from.score : toTier > fromTier;

    // A score on a cut is in the tier above it, so going down leaves that tier
    // from the cut itself.
    const crossed = up
        ? TIERS.slice(fromTier + 1, toTier + 1)
        : TIERS.slice(toTier + 1, fromTier + 1).reverse();
    const cuts = crossed.map((tier) => tier.from);

    const steps: Step[] = [];
    const move = (start: number, end: number) => {
        if (start === end) return;

        steps.push({
            kind: "move",
            from: start,
            to: end,
            duration: MOVE.base + MOVE.perPoint * Math.abs(end - start),
        });
    };

    let at = from.score;
    let tier = fromTier;
    for (const cut of cuts) {
        move(at, cut);

        tier += up ? 1 : -1;
        steps.push({ kind: "cross", cut, up, tier });
        at = cut;
    }
    move(at, to.score);

    return {
        from,
        to,
        steps,
        index: 0,
        elapsed: 0,
        snapped: false,
        score: from.score,
        tier: fromTier,
        flash: steps[0]?.kind === "cross" ? 0 : null,
        burst: null,
        sparks: null,
        slide: null,
        pip: null,
    };
}

function next(timeline: Timeline) {
    timeline.index += 1;
    timeline.elapsed = 0;
    timeline.snapped = false;

    if (timeline.steps[timeline.index]?.kind === "cross") timeline.flash = 0;
}

const aged = <T extends { age: number }>(
    effect: T | null,
    delta: number,
    life: number,
) => {
    if (!effect) return null;

    effect.age += delta;
    return effect.age < life ? effect : null;
};

const older = (age: number | null, delta: number, life: number) =>
    age === null || age + delta >= life ? null : age + delta;

function spawnSparks(): Spark[] {
    return Array.from({ length: SPARKS.count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed =
            SPARKS.speed.min +
            Math.random() * (SPARKS.speed.max - SPARKS.speed.min);

        return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    });
}

/** Moves the timeline on by `delta` seconds and gives the ring as it then stands. */
export function advance(timeline: Timeline, delta: number): Frame {
    let crossed: Frame["crossed"] = null;
    let swelling: Frame["pip"] = null;
    let pace = 0;

    timeline.flash = older(timeline.flash, delta, CROSS.snap);
    timeline.burst = aged(timeline.burst, delta, BURST_SECS);
    timeline.sparks = aged(timeline.sparks, delta, SPARKS.life);
    timeline.slide = aged(timeline.slide, delta, SLIDE_SECS);
    timeline.pip = aged(
        timeline.pip,
        delta,
        timeline.pip?.up ? PIP.in : PIP.out,
    );

    const step = timeline.steps[timeline.index];
    if (step) timeline.elapsed += delta;

    if (step?.kind === "move") {
        const progress = Math.min(1, timeline.elapsed / step.duration);

        timeline.score = step.from + (step.to - step.from) * easeOut(progress);
        // The eased move's slope.
        pace =
            ((step.to - step.from) * 3 * (1 - progress) ** 2) / step.duration;

        if (progress === 1) next(timeline);
    } else if (step) {
        timeline.score = step.cut;

        if (!timeline.snapped && timeline.elapsed >= CROSS.snap) {
            const left = timeline.tier;

            timeline.snapped = true;
            timeline.tier = step.tier;
            timeline.burst = { age: 0, up: step.up };
            if (step.up) timeline.sparks = { age: 0, dots: spawnSparks() };
            timeline.slide = { age: 0, up: step.up, from: left };
            // The pip gained, or the one just lost.
            timeline.pip = {
                age: 0,
                up: step.up,
                index: step.up ? step.tier : left,
            };
            crossed = { up: step.up, tier: step.tier };
        }

        // On a rank down the arc is empty at the cut, so the pip about to go is
        // what winds up.
        if (!timeline.snapped && !step.up) {
            swelling = {
                index: timeline.tier,
                scale:
                    1 +
                    (PIP.swellScale - 1) *
                        easeOut(Math.min(1, timeline.elapsed / CROSS.snap)),
            };
        }

        if (timeline.elapsed >= CROSS.end) next(timeline);
    }

    const { from, to, score, tier, burst, sparks, slide, pip } = timeline;
    const span = to.score - from.score;
    const share = span === 0 ? 1 : (score - from.score) / span;

    return {
        score,
        // Without the parts it left from, they stand as they will end.
        parts: to.parts.map((part, index) => {
            const start = from.parts[index] ?? part;
            return start + (part - start) * share;
        }),
        tier,
        pace,
        fill: fillOf(score, tier),
        flash:
            timeline.flash === null ? 0 : easeIn(timeline.flash / CROSS.snap),
        // Falling in starts gently and settles on the rim.
        burst: burst && {
            up: burst.up,
            progress: (burst.up ? easeOut : easeInOut)(burst.age / BURST_SECS),
        },
        sparks:
            sparks &&
            sparks.dots.map(({ vx, vy }) => ({
                x: vx * sparks.age,
                y: vy * sparks.age + (SPARKS.gravity * sparks.age ** 2) / 2,
                r: SPARKS.radius * (1 - sparks.age / SPARKS.life),
            })),
        slide: slide && {
            from: slide.from,
            up: slide.up,
            progress: easeOut(slide.age / SLIDE_SECS),
        },
        pip: pip ? pipAt(pip) : swelling,
        crossed,
        done:
            timeline.index >= timeline.steps.length &&
            timeline.flash === null &&
            !burst &&
            !sparks &&
            !slide &&
            !pip,
    };
}

export const SPARK_COUNT = SPARKS.count;
