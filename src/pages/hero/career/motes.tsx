import { useEffect, useRef } from "react";

import { REDUCED_MOTION } from "@/utils/motion";

const MAX_MOTES = 36;
const PX_PER_MOTE = 28;
const FRAME_MS = 1000 / 30;
const MAX_DT = 0.1;
const SPRITE_PX = 32;
const TINT_ALPHA = 0.45;

interface Mote {
    x: number;
    y: number;
    radius: number;
    rise: number;
    phase: number;
    sway: number;
    life: number;
    age: number;
    alpha: number;
    tint: boolean;
}

const between = (min: number, max: number) => min + Math.random() * (max - min);

function sprite(color: string, tint: boolean): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = SPRITE_PX;
    canvas.height = SPRITE_PX;
    const ctx = canvas.getContext("2d")!;
    const half = SPRITE_PX / 2;

    // A white falloff recoloured with `source-in`, so the edge never fades
    // through black the way a gradient to `transparent` can.
    const falloff = ctx.createRadialGradient(half, half, 0, half, half, half);
    falloff.addColorStop(0, "rgb(255 255 255 / 1)");
    falloff.addColorStop(0.2, "rgb(255 255 255 / 0.8)");
    falloff.addColorStop(1, "rgb(255 255 255 / 0)");
    ctx.fillStyle = falloff;
    ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);

    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);

    if (tint) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = TINT_ALPHA;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
    }

    return canvas;
}

function spawn(mote: Mote, width: number, height: number, spread: boolean) {
    mote.radius = between(0.6, 2);
    mote.rise = between(6, 14);
    mote.phase = between(0, Math.PI * 2);
    mote.sway = between(2, 8);
    mote.life = between(6, 12);
    mote.alpha = between(0.5, 0.9);
    mote.x = between(0, width);
    mote.tint = Math.random() < 1 / 3;

    // A mote only rises about half the band in its life, so new ones appear
    // anywhere below the top third. On mount the band starts already populated.
    mote.age = spread ? between(0, mote.life) : 0;
    mote.y = between(spread ? 0 : height * 0.3, height);
}

function fade(mote: Mote): number {
    const t = mote.age / mote.life;
    if (t < 0.2) return t / 0.2;
    if (t > 0.7) return (1 - t) / 0.3;

    return 1;
}

export interface MotesProps {
    accent: string | null;
    className?: string;
}

export function Motes({ accent, className }: MotesProps) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const color = getComputedStyle(canvas)
            .getPropertyValue("--accent")
            .trim();
        const sprites = {
            plain: sprite(color, false),
            tint: sprite(color, true),
        };

        const motes: Mote[] = [];
        let width = 0;
        let height = 0;

        let frame = 0;
        let last = 0;
        let inView = false;
        let focused = document.hasFocus();
        const reduce = matchMedia(REDUCED_MOTION);

        const fill = () => {
            const count = Math.min(MAX_MOTES, Math.round(width / PX_PER_MOTE));
            motes.length = Math.min(motes.length, count);
            while (motes.length < count) {
                const mote = {} as Mote;
                spawn(mote, width, height, true);
                motes.push(mote);
            }
        };

        const draw = (dt: number) => {
            ctx.clearRect(0, 0, width, height);

            for (const mote of motes) {
                mote.age += dt;
                mote.y -= mote.rise * dt;
                if (mote.age >= mote.life || mote.y < -mote.radius * 3) {
                    spawn(mote, width, height, false);
                }

                const size = mote.radius * 6;
                const x = mote.x + Math.sin(mote.phase + mote.age) * mote.sway;

                ctx.globalAlpha = mote.alpha * fade(mote);
                ctx.drawImage(
                    mote.tint ? sprites.tint : sprites.plain,
                    x - size / 2,
                    mote.y - size / 2,
                    size,
                    size,
                );
            }

            ctx.globalAlpha = 1;
        };

        const tick = (now: number) => {
            frame = requestAnimationFrame(tick);

            const elapsed = now - last;
            if (elapsed < FRAME_MS) return;

            last = now;
            draw(Math.min(elapsed / 1000, MAX_DT));
        };

        const sync = () => {
            const running =
                inView && focused && !document.hidden && !reduce.matches;

            if (running && !frame) {
                last = performance.now();
                frame = requestAnimationFrame(tick);
            } else if (!running && frame) {
                cancelAnimationFrame(frame);
                frame = 0;
            }

            if (reduce.matches) ctx.clearRect(0, 0, width, height);
        };

        const onResize = () => {
            const dpr = devicePixelRatio;
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            fill();
            if (!reduce.matches) draw(0);
        };

        const onIntersect = ([entry]: IntersectionObserverEntry[]) => {
            inView = entry.isIntersecting;
            sync();
        };

        const onFocus = () => {
            focused = true;
            sync();
        };

        const onBlur = () => {
            focused = false;
            sync();
        };

        const resizer = new ResizeObserver(onResize);
        const viewer = new IntersectionObserver(onIntersect);

        // The page mounts in one big commit; observing straight away would put
        // the backing store allocation and first draw in that same frame.
        let start = requestAnimationFrame(() => {
            start = requestAnimationFrame(() => {
                resizer.observe(canvas);
                viewer.observe(canvas);
            });
        });

        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);
        document.addEventListener("visibilitychange", sync);
        reduce.addEventListener("change", sync);

        return () => {
            cancelAnimationFrame(start);
            cancelAnimationFrame(frame);
            resizer.disconnect();
            viewer.disconnect();

            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
            document.removeEventListener("visibilitychange", sync);
            reduce.removeEventListener("change", sync);
        };
    }, [accent]);

    return <canvas aria-hidden ref={ref} className={className} />;
}
