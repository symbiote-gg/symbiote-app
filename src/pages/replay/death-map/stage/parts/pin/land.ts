import { type Tween, tween } from "@/hooks/useAppear";
import { EASE_SETTLE_CURVE, ENTER_MS, TRAVEL_MS } from "@/utils/motion";

const PEAK = 0.45;
const RIPPLE_PX = 16;

const lerp = (from: number, to: number, progress: number) =>
    from + (to - from) * progress;

/** A pin dropping onto the map: it swells past its size and a ring spreads out from it. */
export function land(el: HTMLElement): Tween {
    const portrait = el.firstElementChild;
    const colour =
        (portrait &&
            getComputedStyle(portrait)
                .getPropertyValue("--tw-ring-color")
                .trim()) ||
        "currentColor";

    return tween(
        el,
        ["transform", "filter", "box-shadow"],
        TRAVEL_MS,
        0,
        EASE_SETTLE_CURVE,
        (progress) => {
            const scale =
                progress < PEAK
                    ? lerp(0.6, 1.18, progress / PEAK)
                    : lerp(1.18, 1, (progress - PEAK) / (1 - PEAK));
            const spread = lerp(0, RIPPLE_PX, progress);
            const alpha = lerp(55, 0, progress);

            el.style.transform = `scale(${scale})`;
            el.style.filter = `brightness(${lerp(1.4, 1, progress)})`;
            el.style.boxShadow = `0 0 0 ${spread / scale}px color-mix(in srgb, ${colour} ${alpha}%, transparent)`;
        },
    );
}

/** The reverse, as the scrubber backs past a pin: it dims to its faded look. */
export function lift(el: HTMLElement): Tween {
    const faded = Number(getComputedStyle(el).opacity);

    return tween(
        el,
        ["opacity"],
        ENTER_MS,
        0,
        EASE_SETTLE_CURVE,
        (progress) => {
            el.style.opacity = String(lerp(1, faded, progress));
        },
    );
}
