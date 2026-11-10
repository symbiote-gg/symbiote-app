import { type RefObject, useEffectEvent, useLayoutEffect, useRef } from "react";

import {
    EASE_SETTLE,
    ENTER_MS,
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

function pop(el: HTMLElement, delay: number): Animation {
    return el.animate(
        [
            { transform: "scale(0.85)", filter: "brightness(0.4)" },
            {
                transform: "scale(1.03)",
                filter: "brightness(1.2)",
                offset: 0.6,
            },
            {},
        ],
        { duration: ENTER_MS, delay, easing: EASE_SETTLE, fill: "backwards" },
    );
}

function drop(el: HTMLElement, delay: number): Animation {
    return el.animate(
        [{ transform: "translateY(-10px)", filter: "brightness(0.5)" }, {}],
        { duration: ENTER_MS, delay, easing: EASE_SETTLE, fill: "backwards" },
    );
}

function sweep(el: HTMLElement, delay: number): Animation {
    return el.animate(
        [
            { transform: "translateX(-150%) skewX(-12deg)" },
            { transform: "translateX(350%) skewX(-12deg)" },
        ],
        { duration: TRAVEL_MS, delay, easing: EASE_SETTLE },
    );
}

function glow(el: HTMLElement, delay: number): Animation {
    const style = getComputedStyle(el);
    const ring = style.boxShadow === "none" ? "" : `${style.boxShadow}, `;
    const accent = style.getPropertyValue("--accent").trim();

    return el.animate(
        [
            { boxShadow: `${ring}0 0 18px 4px ${accent}` },
            { boxShadow: `${ring}0 0 0 0 ${accent}` },
        ],
        { duration: TRAVEL_MS, delay, easing: EASE_SETTLE, fill: "backwards" },
    );
}

export function useAppear(
    ref: RefObject<HTMLElement | null>,
    appear: AppearCheck | undefined,
    kind: AppearKind,
    parts: AppearParts = {},
) {
    const decided = useRef<boolean | null>(null);

    // Animates only on mount, with the props of that render.
    const animate = useEffectEvent(() => {
        const el = ref.current;
        if (!el || reducedMotion()) return;

        if (decided.current === null) decided.current = appear?.() ?? false;
        if (!decided.current) return;

        const delay = nextStagger();
        const animations = [kind === "card" ? pop(el, delay) : drop(el, delay)];

        const find = (name?: string) =>
            name ? el.querySelector<HTMLElement>(`.${name}`) : null;

        const swept = find(parts.sweep);
        if (swept) animations.push(sweep(swept, delay));

        const ringed = find(parts.glow);
        if (ringed) animations.push(glow(ringed, delay));

        return () => {
            for (const animation of animations) animation.cancel();
        };
    });

    useLayoutEffect(() => animate(), []);
}
