import classNames from "classnames";
import { useReducedMotion } from "motion/react";
import {
    type ReactNode,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
} from "react";
import { useTranslations } from "use-intl";

import type { ScorePillar } from "@/api/stats";
import { subscribe } from "@/utils/frame-loop";
import { Sheen } from "../sheen";
import { sheenFill } from "../sheen/fill";
import { type ScoreTier, TIERS } from "../tiers";
import {
    CENTER,
    arc,
    digitCount,
    fixed,
    odometer,
    point,
    sweepAngle,
} from "./geometry";
import {
    MOTE_COUNT,
    type Mote,
    RUSH_SECS,
    createMotes,
    drift,
    followPace,
    moteAt,
    paceSpeed,
    rushSpeed,
} from "./motes";
import {
    type Frame,
    SPARK_COUNT,
    type Target,
    type Timeline,
    advance,
    createTimeline,
    moves,
    rest,
} from "./timeline";

import styles from "./styles.module.css";

// The drawing is laid out on 600 by 600 and shown cropped to what stands still:
// what bursts out of the ring overflows the crop.
const VIEW_BOX = "80 80 440 510";

const RANK = { radius: 196, stroke: 20, flash: 8 };
const CORE = { radius: 150 };
const BURST = { reach: 70, stroke: 4 };

// A hexagon, point up, matching the ladder's gems.
const hexPath = (cx: number, cy: number, radius: number) =>
    Array.from({ length: 6 }, (_, corner) => {
        const angle = ((corner * 60 - 90) * Math.PI) / 180;
        const x = fixed(cx + radius * Math.cos(angle));
        const y = fixed(cy + radius * Math.sin(angle));

        return `${corner ? "L" : "M"}${x},${y}`;
    }).join(" ") + " Z";

const FACET_SCALE = 0.55;

const PIPS = { half: 8, gap: 26, y: CENTER - 96 };
const PIP = hexPath(0, 0, PIPS.half);
const PIP_FACET = hexPath(0, 0, PIPS.half * FACET_SCALE);

const pipAt = (index: number, scale = 1) =>
    `translate(${CENTER + (index - (TIERS.length - 1) / 2) * PIPS.gap} ${PIPS.y}) scale(${fixed(scale)})`;

const SCORE = {
    baseline: 333,
    /** The gap between a column's stacked digits. */
    line: 124,
    window: { width: 240, height: 108, y: 237 },
    /** A digit's width until it's measured. */
    advance: 58,
    /** Enough for 100. */
    columns: 3,
};
// A column's digits, the 0 again after the 9 for the turn back to it.
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const CAPTION_Y = 364;

const GEM = { y: 500, radius: 18.5 };
const GEM_SHAPE = hexPath(CENTER, GEM.y, GEM.radius);
const GEM_FACET = hexPath(CENTER, GEM.y, GEM.radius * FACET_SCALE);

const NAME = { baseline: 579, window: { y: 552, height: 38 }, slide: 34 };

const LAYERS = [
    "fill",
    "burst",
    "lit",
    "digits",
    "name",
    "leaving",
    "sparks",
    "motes",
] as const;

type Layers = Record<(typeof LAYERS)[number] | "root", Element | null>;

const collect = (root: SVGSVGElement | null) =>
    Object.fromEntries([
        ["root", root],
        ...LAYERS.map((layer) => [
            layer,
            root?.querySelector(`[data-layer="${layer}"]`) ?? null,
        ]),
    ]) as Layers;

/** What moves the ring, kept through renders. */
type Runtime = {
    layers: Layers | null;
    names: string[];
    advance: number;
    /** What the ring last drew. */
    shown: Target | null;
    timeline: Timeline | null;
    motes: Mote[] | null;
    rush: number;
    pace: number;
    visible: boolean;
    stop: (() => void) | null;
    from?: number | null;
    onFrame?: (parts: number[]) => void;
    onRankChange?: (up: boolean, tier: ScoreTier) => void;
    onShown?: (score: number) => void;
};

const offset = (y: number) => `translate(0 ${fixed(y)})`;

function paint(frame: Frame, { layers, names, advance }: Runtime) {
    if (!layers) return;

    const start = sweepAngle(0);
    const end = sweepAngle(frame.fill);
    const rank = TIERS[frame.tier].rank;

    layers.root?.setAttribute("data-rank", rank);

    layers.fill?.setAttribute("d", arc(RANK.radius, start, end));
    layers.fill?.setAttribute(
        "stroke-width",
        `${fixed(RANK.stroke + RANK.flash * frame.flash)}`,
    );

    // Fading by getting thinner: an animated opacity makes WebKitGTK hide the
    // page's overlay scrollbar while it runs.
    const burst = frame.burst;
    const reach = burst ? (burst.up ? burst.progress : 1 - burst.progress) : 0;
    layers.burst?.setAttribute(
        "r",
        `${burst ? fixed(CORE.radius + BURST.reach * reach) : 0}`,
    );
    layers.burst?.setAttribute(
        "stroke-width",
        `${burst ? fixed(BURST.stroke * (1 - burst.progress)) : 0}`,
    );

    const [sparkX, sparkY] = point(RANK.radius, sweepAngle(1));
    Array.from(layers.sparks?.children ?? []).forEach((spark, index) => {
        const dot = frame.sparks?.[index];

        spark.setAttribute("cx", `${fixed(sparkX + (dot?.x ?? 0))}`);
        spark.setAttribute("cy", `${fixed(sparkY + (dot?.y ?? 0))}`);
        spark.setAttribute("r", `${fixed(dot?.r ?? 0)}`);
    });

    Array.from(layers.lit?.children ?? []).forEach((pip, index) => {
        const effect = frame.pip?.index === index ? frame.pip : null;

        pip.setAttribute(
            "transform",
            pipAt(index, effect?.scale ?? (index <= frame.tier ? 1 : 0)),
        );
    });

    const count = digitCount(frame.score);
    odometer(frame.score).forEach((position, index) => {
        const column = layers.digits?.children[index];
        const x = CENTER + ((count - 1) / 2 - index) * advance;

        column?.setAttribute(
            "transform",
            `translate(${fixed(x)} ${fixed(-position * SCORE.line)})`,
        );
        column?.setAttribute(
            "visibility",
            index < count ? "visible" : "hidden",
        );
    });

    // A rank up pushes the names upwards, a rank down downwards.
    const { name, leaving } = layers;
    const slide = frame.slide;
    const way = slide?.up ? 1 : -1;

    if (name && name.textContent !== names[frame.tier]) {
        name.textContent = names[frame.tier];
    }
    name?.setAttribute("data-rank", rank);
    name?.setAttribute(
        "transform",
        offset(slide ? way * NAME.slide * (1 - slide.progress) : 0),
    );

    if (slide && leaving) {
        leaving.textContent = names[slide.from];
        leaving.setAttribute("data-rank", TIERS[slide.from].rank);
    }
    // Out of its window when no name is leaving.
    leaving?.setAttribute(
        "transform",
        offset(
            slide ? -way * NAME.slide * slide.progress : NAME.window.height * 2,
        ),
    );
}

function paintMotes({ layers, motes }: Runtime) {
    Array.from(layers?.motes?.children ?? []).forEach((circle, index) => {
        const mote = motes?.[index];
        const { x, y, r } = mote ? moteAt(mote) : { x: 0, y: 0, r: 0 };

        circle.setAttribute("cx", `${fixed(x)}`);
        circle.setAttribute("cy", `${fixed(y)}`);
        circle.setAttribute("r", `${fixed(r)}`);
    });
}

function draw(runtime: Runtime, frame: Frame) {
    paint(frame, runtime);

    runtime.shown = {
        score: frame.score,
        parts: frame.parts,
        tier: frame.tier,
    };
    runtime.onFrame?.(frame.parts);

    if (frame.crossed) {
        if (frame.crossed.up) runtime.rush = RUSH_SECS;

        runtime.onRankChange?.(
            frame.crossed.up,
            TIERS[frame.crossed.tier].tier,
        );
    }

    if (frame.done) runtime.onShown?.(frame.score);
}

/** Runs the loop while a change or the motes are playing in view, and only then. */
function sync(runtime: Runtime) {
    const playing =
        (runtime.timeline !== null || runtime.motes !== null) &&
        runtime.visible;

    if (playing && !runtime.stop) {
        runtime.stop = subscribe((delta) => {
            const frame = runtime.timeline && advance(runtime.timeline, delta);

            if (runtime.motes) {
                runtime.pace = followPace(
                    runtime.pace,
                    frame?.pace ?? 0,
                    delta,
                );
                drift(
                    runtime.motes,
                    delta,
                    rushSpeed(runtime.rush) + paceSpeed(runtime.pace),
                );
                paintMotes(runtime);

                runtime.rush = Math.max(0, runtime.rush - delta);
            }

            if (!frame) return;

            if (frame.done) runtime.timeline = null;

            draw(runtime, frame);
            if (frame.done) sync(runtime);
        });
    } else if (!playing && runtime.stop) {
        runtime.stop();
        runtime.stop = null;
    }
}

interface DialProps {
    /** What runs along the track, under the core. */
    fill?: ReactNode;
    /** What floats on the core, under its rim. */
    motes?: ReactNode;
    /** What lights the pips, over their empty slots. */
    lit?: ReactNode;
}

function Dial({ fill, motes, lit }: DialProps) {
    return (
        <>
            <path
                d={arc(RANK.radius, sweepAngle(0), sweepAngle(1))}
                className={styles.track}
            />
            {fill}
            <circle
                cx={CENTER}
                cy={CENTER}
                r={CORE.radius}
                className={styles.core}
            />
            {motes}
            <circle
                cx={CENTER}
                cy={CENTER}
                r={CORE.radius}
                className={styles.rim}
            />
            <g>
                {TIERS.map(({ tier }, index) => (
                    <g key={tier} transform={pipAt(index)}>
                        <path d={PIP} className={styles.pip} />
                        <path d={PIP_FACET} className={styles.facet} />
                    </g>
                ))}
            </g>
            {lit}
            <path d={GEM_SHAPE} className={styles.gem} />
            <path d={GEM_FACET} className={styles.facet} />
        </>
    );
}

// A bar where the rank's name will stand.
const NAME_BAR = { width: 220, height: 22 };

export function RingSkeleton() {
    return (
        <svg viewBox={VIEW_BOX} aria-hidden className={styles.root}>
            <Dial />
            <rect
                x={CENTER - NAME_BAR.width / 2}
                y={NAME.baseline - NAME_BAR.height}
                width={NAME_BAR.width}
                height={NAME_BAR.height}
                rx={6}
                className={styles.bar}
            />
        </svg>
    );
}

export interface ScoreRingProps {
    value: number | null;
    pillars: ScorePillar[];
    /** The score to move from as the ring first shows, when it isn't `value`. */
    from?: number | null;
    label: string;
    /** Called with each part's points as the ring draws them. */
    onFrame?: (parts: number[]) => void;
    onRankChange?: (up: boolean, tier: ScoreTier) => void;
    /** Called with the score once the ring stands on it. */
    onShown?: (score: number) => void;
}

export function ScoreRing({
    value,
    pillars,
    from,
    label,
    onFrame,
    onRankChange,
    onShown,
}: ScoreRingProps) {
    const t = useTranslations("profile.score");
    const id = useId();
    const still = useReducedMotion() ?? false;

    const root = useRef<SVGSVGElement>(null);
    const runtime = useRef<Runtime>({
        layers: null,
        names: [],
        advance: SCORE.advance,
        shown: null,
        timeline: null,
        motes: null,
        rush: 0,
        pace: 0,
        visible: false,
        stop: null,
    });

    const empty = value === null;

    useLayoutEffect(() => {
        runtime.current.names = TIERS.map(({ tier }) => t(`tier.${tier}`));
        runtime.current.from = from;
        runtime.current.onFrame = onFrame;
        runtime.current.onRankChange = onRankChange;
        runtime.current.onShown = onShown;
    });

    // Drawn here and not through React, so the loop moving the ring on a change is
    // the only one writing these. `from` only counts as the ring first shows, so it's
    // read off the runtime: a later change to it mustn't cut a move short.
    useLayoutEffect(() => {
        const state = runtime.current;

        if (value === null) {
            state.layers = null;
            state.shown = null;
            state.timeline = null;
            state.motes = null;
            sync(state);

            root.current?.removeAttribute("data-rank");
            return;
        }

        state.layers = collect(root.current);

        state.motes = still ? null : (state.motes ?? createMotes());
        paintMotes(state);

        state.advance =
            state.layers.digits
                ?.querySelector("text")
                ?.getComputedTextLength() || state.advance;

        const target = {
            score: value,
            parts: pillars.map((pillar) => pillar.points),
        };
        // The parts as they stood at `from` aren't known: the same split is kept.
        const origin = state.from;
        const start =
            state.shown ??
            (origin == null
                ? null
                : {
                      score: origin,
                      parts: target.parts.map((part) =>
                          value > 0 ? (part * origin) / value : 0,
                      ),
                  });

        if (still || !start || !moves(start, target)) {
            state.timeline = null;
            draw(state, rest(target));
        } else {
            state.timeline = createTimeline(start, target);
            draw(state, advance(state.timeline, 0));
        }

        sync(state);
    }, [value, pillars, still]);

    useEffect(() => {
        const element = root.current;
        const state = runtime.current;
        if (!element || empty) return;

        const observer = new IntersectionObserver((entries) => {
            // The last of a batch is where it stands now.
            state.visible = entries[entries.length - 1].isIntersecting;
            sync(state);
        });
        observer.observe(element);

        let cancelled = false;
        document.fonts.ready.then(() => {
            const measured = state.layers?.digits
                ?.querySelector("text")
                ?.getComputedTextLength();
            if (cancelled || !measured) return;

            state.advance = measured;
            if (!state.timeline && state.shown) draw(state, rest(state.shown));
        });

        return () => {
            cancelled = true;
            observer.disconnect();

            state.visible = false;
            sync(state);
        };
    }, [empty]);

    return (
        <svg
            ref={root}
            viewBox={VIEW_BOX}
            role="img"
            aria-label={label}
            className={styles.root}
            style={sheenFill(`${id}-sheen`)}
        >
            <defs>
                <Sheen id={`${id}-sheen`} />
                <clipPath id={`${id}-core`}>
                    <circle cx={CENTER} cy={CENTER} r={CORE.radius} />
                </clipPath>
                <clipPath id={`${id}-score`}>
                    <rect
                        x={CENTER - SCORE.window.width / 2}
                        y={SCORE.window.y}
                        width={SCORE.window.width}
                        height={SCORE.window.height}
                    />
                </clipPath>
                <clipPath id={`${id}-name`}>
                    <rect
                        x={0}
                        y={NAME.window.y}
                        width={CENTER * 2}
                        height={NAME.window.height}
                    />
                </clipPath>
            </defs>
            <g aria-hidden>
                <Dial
                    lit={
                        !empty && (
                            <g data-layer="lit">
                                {TIERS.map(({ tier }) => (
                                    <g key={tier}>
                                        <path d={PIP} className={styles.lit} />
                                        <path
                                            d={PIP_FACET}
                                            className={styles.facet}
                                        />
                                    </g>
                                ))}
                            </g>
                        )
                    }
                    motes={
                        !empty && (
                            <g data-layer="motes" clipPath={`url(#${id}-core)`}>
                                {Array.from(
                                    { length: MOTE_COUNT },
                                    (_, index) => (
                                        <circle
                                            key={index}
                                            className={
                                                index % 3
                                                    ? styles.mote
                                                    : styles.deepMote
                                            }
                                        />
                                    ),
                                )}
                            </g>
                        )
                    }
                    fill={
                        !empty && (
                            <>
                                <path
                                    data-layer="fill"
                                    className={styles.fill}
                                />
                                <circle
                                    data-layer="burst"
                                    cx={CENTER}
                                    cy={CENTER}
                                    className={styles.burst}
                                />
                            </>
                        )
                    }
                />
                {empty ? (
                    <text
                        x={CENTER}
                        y={SCORE.baseline}
                        className={classNames(styles.score, styles.noScore)}
                    >
                        -
                    </text>
                ) : (
                    <>
                        <g
                            data-layer="digits"
                            clipPath={`url(#${id}-score)`}
                            className={styles.score}
                        >
                            {Array.from(
                                { length: SCORE.columns },
                                (_, column) => (
                                    <g key={column}>
                                        {STRIP.map((digit, index) => (
                                            <text
                                                key={index}
                                                y={
                                                    SCORE.baseline +
                                                    index * SCORE.line
                                                }
                                            >
                                                {digit}
                                            </text>
                                        ))}
                                    </g>
                                ),
                            )}
                        </g>
                        <text
                            x={CENTER}
                            y={CAPTION_Y}
                            className={styles.caption}
                        >
                            {t("outOf")}
                        </text>
                    </>
                )}
                <g clipPath={`url(#${id}-name)`}>
                    {empty ? (
                        <text
                            key="empty"
                            x={CENTER}
                            y={NAME.baseline}
                            className={styles.name}
                        >
                            {t("notEnough")}
                        </text>
                    ) : (
                        <>
                            <text
                                key="name"
                                data-layer="name"
                                x={CENTER}
                                y={NAME.baseline}
                                className={styles.name}
                            />
                            <text
                                key="leaving"
                                data-layer="leaving"
                                x={CENTER}
                                y={NAME.baseline}
                                className={styles.name}
                            />
                        </>
                    )}
                </g>
                {!empty && (
                    <g data-layer="sparks">
                        {Array.from({ length: SPARK_COUNT }, (_, index) => (
                            <circle
                                key={index}
                                className={
                                    index % 3 ? styles.spark : styles.whiteSpark
                                }
                            />
                        ))}
                    </g>
                )}
            </g>
        </svg>
    );
}
