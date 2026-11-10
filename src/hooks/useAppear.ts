import { animate } from "motion";
import { type RefObject, useEffectEvent, useLayoutEffect, useRef } from "react";

import {
    CARD_STAGGER,
    EASE_SETTLE_CURVE,
    EASE_SWEEP_CURVE,
    ENTER_MS,
    REVEAL_MS,
    ROW_STAGGER,
    TRAVEL_MS,
    nextStagger,
    reducedMotion,
} from "@/utils/motion";

export type AppearKind = "card" | "row";

export type AppearCheck = () => boolean;

export interface AppearParts {
    glow?: string;
    sweep?: string;
}

type Ease = typeof EASE_SETTLE_CURVE | typeof EASE_SWEEP_CURVE;

interface Tween {
    play: () => void;
    cancel: () => void;
}

const POP_PEAK = 0.6;

const lerp = (from: number, to: number, progress: number) =>
    from + (to - from) * progress;

const overshoot = (progress: number, [from, peak, to]: number[]) =>
    progress < POP_PEAK
        ? lerp(from, peak, progress / POP_PEAK)
        : lerp(peak, to, (progress - POP_PEAK) / (1 - POP_PEAK));

function tween(
    el: HTMLElement,
    props: string[],
    duration: number,
    delay: number,
    ease: Ease,
    update: (progress: number) => void,
): Tween {
    const reset = () => {
        for (const prop of props) el.style.removeProperty(prop);
    };

    update(0);

    const controls = animate(0, 1, {
        duration: duration / 1000,
        delay: delay / 1000,
        ease: [...ease],
        autoplay: false,
        onUpdate: update,
        onComplete: reset,
    });

    return {
        play: () => controls.play(),
        cancel: () => {
            controls.stop();
            reset();
        },
    };
}

function pop(el: HTMLElement, delay: number): Tween {
    return tween(
        el,
        ["transform", "filter"],
        TRAVEL_MS,
        delay,
        EASE_SETTLE_CURVE,
        (progress) => {
            const scale = overshoot(progress, [0.85, 1.03, 1]);
            const brightness = overshoot(progress, [0.4, 1.2, 1]);

            el.style.transform = `scale(${scale})`;
            el.style.filter = `brightness(${brightness})`;
        },
    );
}

function drop(el: HTMLElement, delay: number): Tween {
    return tween(
        el,
        ["transform", "filter"],
        ENTER_MS,
        delay,
        EASE_SETTLE_CURVE,
        (progress) => {
            el.style.transform = `translateY(${lerp(-10, 0, progress)}px)`;
            el.style.filter = `brightness(${lerp(0.5, 1, progress)})`;
        },
    );
}

function sweep(el: HTMLElement, delay: number): Tween {
    return tween(
        el,
        ["transform"],
        REVEAL_MS,
        delay,
        EASE_SWEEP_CURVE,
        (progress) => {
            const x = lerp(-125, 225, progress);
            el.style.transform = `translateX(${x}%) skewX(-12deg)`;
        },
    );
}

function glow(el: HTMLElement, delay: number): Tween {
    const style = getComputedStyle(el);
    const ring = style.boxShadow === "none" ? "" : `${style.boxShadow}, `;
    const accent = style.getPropertyValue("--accent").trim();

    return tween(
        el,
        ["box-shadow"],
        REVEAL_MS,
        delay,
        EASE_SETTLE_CURVE,
        (progress) => {
            const blur = lerp(18, 0, progress);
            const spread = lerp(4, 0, progress);
            el.style.boxShadow = `${ring}0 0 ${blur}px ${spread}px ${accent}`;
        },
    );
}

export function useAppear(
    ref: RefObject<HTMLElement | null>,
    appear: AppearCheck | undefined,
    kind: AppearKind,
    parts: AppearParts = {},
) {
    const decided = useRef<boolean | null>(null);
    const delay = useRef<number | null>(null);

    const start = useEffectEvent(() => {
        const el = ref.current;
        if (!el || reducedMotion()) return;

        if (decided.current === null) decided.current = appear?.() ?? false;
        if (!decided.current) return;

        delay.current ??= nextStagger(
            kind === "card" ? CARD_STAGGER : ROW_STAGGER,
        );
        const wait = delay.current;

        const tweens = [kind === "card" ? pop(el, wait) : drop(el, wait)];

        const find = (name?: string) =>
            name ? el.querySelector<HTMLElement>(`.${name}`) : null;

        const swept = find(parts.sweep);
        if (swept) tweens.push(sweep(swept, wait));

        const ringed = find(parts.glow);
        if (ringed) tweens.push(glow(ringed, wait));

        // Held on the first frame until the mount has painted, so a slow first
        // paint can't swallow the start.
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                for (const tween of tweens) tween.play();
            });
        });

        return () => {
            cancelAnimationFrame(frame);
            for (const tween of tweens) tween.cancel();
        };
    });

    useLayoutEffect(() => start(), []);
}
