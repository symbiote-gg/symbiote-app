import {
    type RefObject,
    useEffect,
    useEffectEvent,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { type Tween, tween } from "@/hooks/useAppear";
import { EASE_SETTLE_CURVE, reducedMotion } from "@/utils/motion";

const CARDS = 7;
const HALF_MS = 100;
const DEAL_GAP_MS = 62;
const OPEN_DELAY_MS = 70;

/**
 * Deals a row of `CARDS` cards in `slots` face up, left to right, each folding flat
 * and unfolding on its other side. `drawn` changes with every new draw and is null
 * while one is pending, which turns every card face down. A draw equal to `revealed`
 * was already dealt, so it shows face up at once. `onSwap` fires once the cards are
 * face down, for the new draw to replace the old one only out of sight.
 */
export function useCardFlip(
    drawn: number | null,
    revealed: number | null,
    onRevealed: (drawn: number) => void,
    onSwap: () => void,
    slots: RefObject<HTMLElement | null>,
) {
    const [reduced] = useState(reducedMotion);
    const [faceUp, setFaceUp] = useState(() =>
        reduced || (drawn !== null && drawn === revealed) ? CARDS : 0,
    );
    const tweens = useRef<(Tween | undefined)[]>([]);
    const unfolding = useRef<number[]>([]);
    const downAt = useRef(-Infinity);
    const facingDown = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [dealt, setDealt] = useState(faceUp === CARDS ? drawn : null);
    const shownUp = useRef(faceUp);
    const reveal = useEffectEvent(onRevealed);
    const swap = useEffectEvent(onSwap);

    const slot = (index: number) =>
        slots.current?.children[index] as HTMLElement | undefined;

    const scale = (index: number, from: number, to: number) => {
        const el = slot(index);
        if (!el) return;

        // Before the new tween sets its first frame, which the old one's reset would undo.
        tweens.current[index]?.cancel();

        // A folded card stays flat until its other side replaces it.
        const motion = tween(
            el,
            to === 0 ? [] : ["transform"],
            HALF_MS,
            0,
            EASE_SETTLE_CURVE,
            (progress) => {
                el.style.transform = `scaleX(${from + (to - from) * progress})`;
            },
        );
        tweens.current[index] = motion;
        motion.play();
    };

    // Swapped slots mount folded, then open up on their new side.
    useLayoutEffect(() => {
        for (const index of unfolding.current) {
            const el = slot(index);
            if (el) el.style.transform = "scaleX(0)";
            scale(index, 0, 1);
        }
        unfolding.current = [];
        shownUp.current = faceUp;
    }, [faceUp]);

    useEffect(() => {
        if (reduced) {
            if (drawn !== null) swap();
            return;
        }

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        const later = (ms: number, run: () => void) =>
            timeouts.push(setTimeout(run, ms));

        if (drawn === null) {
            const up = shownUp.current;
            for (let index = 0; index < up; index++) scale(index, 1, 0);

            // The new draw lands mid fold more often than not, and must not cancel
            // the turn to the backs, or the deal would fold cards already flat.
            downAt.current = performance.now();
            clearTimeout(facingDown.current);
            facingDown.current = setTimeout(
                () => {
                    unfolding.current = Array.from({ length: up }, (_, i) => i);
                    setFaceUp(0);
                },
                up > 0 ? HALF_MS : 0,
            );
        } else if (drawn !== dealt) {
            const settled = downAt.current + 2 * HALF_MS - performance.now();
            const start =
                downAt.current === -Infinity
                    ? OPEN_DELAY_MS
                    : Math.max(0, settled);

            later(start, swap);

            for (let index = 0; index < CARDS; index++) {
                const at = start + index * DEAL_GAP_MS;
                later(at, () => scale(index, 1, 0));
                later(at + HALF_MS, () => {
                    unfolding.current = [index];
                    setFaceUp(index + 1);
                });
            }

            later(start + (CARDS - 1) * DEAL_GAP_MS + 2 * HALF_MS, () => {
                setDealt(drawn);
                reveal(drawn);
            });
        }

        return () => timeouts.forEach(clearTimeout);
        // Only a new draw deals, not `dealt` catching up with it.
    }, [drawn, reduced]);

    useEffect(
        () => () => {
            clearTimeout(facingDown.current);
            tweens.current.forEach((motion) => motion?.cancel());
        },
        [],
    );

    const busy = drawn === null || (!reduced && drawn !== dealt);

    return { faceUp, busy, reduced };
}
