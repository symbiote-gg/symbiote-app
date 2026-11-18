import {
    type FocusEvent,
    type PointerEvent,
    memo,
    useId,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import { HeroPortrait } from "@/components";
import { Popover } from "@/ui";
import { TIERS, rankTone, tierIndex } from "../score-card/tiers";
import { HeroPanel } from "./hero-panel";
import { PITCH, type Placed } from "./swarm";

import styles from "./styles.module.css";

const hitAt = (target: EventTarget | null) =>
    target instanceof Element
        ? target.closest<HTMLSpanElement>("[data-hero]")
        : null;

export interface DotsProps {
    dots: Placed[];
}

export function Dots({ dots }: DotsProps) {
    const panel = useId();

    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
    const active = anchor ? Number(anchor.dataset.hero) : -1;

    const onOver = (
        e: PointerEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>,
    ) => {
        // Over the plot's empty space the target is the plot itself, which closes it.
        const hit = hitAt(e.target);
        if (hit !== anchor) setAnchor(hit);
    };
    // A dot with keyboard focus keeps its panel after the pointer leaves.
    const onLeave = (e: PointerEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(document.activeElement)) setAnchor(null);
    };

    // Tabbing from dot to dot would otherwise close the panel in between.
    const onBlur = (e: FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setAnchor(null);
    };

    return (
        <div
            className={styles.dots}
            onPointerOver={onOver}
            onPointerLeave={onLeave}
            onFocus={onOver}
            onBlur={onBlur}
        >
            {dots.map((dot, index) => (
                <Dot
                    key={dot.hero.heroId}
                    dot={dot}
                    index={index}
                    active={index === active}
                    panel={panel}
                />
            ))}
            {active >= 0 && dots[active] && (
                <Popover
                    id={panel}
                    role="tooltip"
                    anchor={anchor}
                    placement="top"
                    compact={false}
                    interactive={false}
                    className={styles.popover}
                >
                    <HeroPanel
                        key={dots[active].hero.heroId}
                        hero={dots[active].hero}
                    />
                </Popover>
            )}
        </div>
    );
}

interface DotProps {
    dot: Placed;
    index: number;
    active: boolean;
    panel: string;
}

// Memoized so a hover only re-renders the dots whose active state flips.
const Dot = memo(function Dot({ dot, index, active, panel }: DotProps) {
    const t = useTranslations("profile.score.heroes");
    const { hero, left, row, size, main } = dot;

    return (
        <span
            data-hero={index}
            data-active={active || undefined}
            role="img"
            tabIndex={0}
            aria-label={t("dotLabel", {
                hero: hero.name,
                score: hero.score,
                games: hero.games,
            })}
            aria-describedby={active ? panel : undefined}
            className={styles.dot}
            style={{
                ...rankTone(TIERS[tierIndex(hero.score)].rank),
                left,
                bottom: row * PITCH + (PITCH - size) / 2,
                width: size,
                height: size,
            }}
        >
            {main && (
                <HeroPortrait
                    name={hero.name}
                    portrait={hero.portrait}
                    size="xs"
                    className={styles.portrait}
                />
            )}
        </span>
    );
});
