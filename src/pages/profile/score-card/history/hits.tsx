import { type FocusEvent, type PointerEvent, useId, useState } from "react";

import { Popover } from "@/ui";
import { DayPanel } from "./day-panel";
import type { ScoreDay } from "./days";

import styles from "./styles.module.css";

const hitAt = (target: EventTarget | null) =>
    target instanceof Element
        ? target.closest<HTMLSpanElement>("[data-day]")
        : null;

export interface HitsProps {
    days: ScoreDay[];
    labels: string[];
    x: (at: number) => number;
}

export function Hits({ days, labels, x }: HitsProps) {
    const panel = useId();

    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
    const active = anchor ? Number(anchor.dataset.day) : -1;

    const onOver = (
        e: PointerEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>,
    ) => {
        const hit = hitAt(e.target);
        if (hit && hit !== anchor) setAnchor(hit);
    };
    const onOut = () => setAnchor(null);

    return (
        <div
            className={styles.hits}
            onPointerOver={onOver}
            onPointerLeave={onOut}
            onFocus={onOver}
            onBlur={onOut}
        >
            {days.map((day, index) => (
                <span
                    key={day.day.valueOf()}
                    data-day={index}
                    className={styles.hit}
                    style={{
                        left: `${x(day.from)}%`,
                        width: `${x(day.to) - x(day.from)}%`,
                    }}
                >
                    <span
                        tabIndex={0}
                        aria-label={labels[index]}
                        aria-describedby={index === active ? panel : undefined}
                        className={styles.crosshair}
                    />
                </span>
            ))}
            {active >= 0 && days[active] && (
                <Popover
                    id={panel}
                    role="tooltip"
                    anchor={anchor}
                    placement="top"
                    compact={false}
                    interactive={false}
                    className={styles.popover}
                >
                    <DayPanel day={days[active]} />
                </Popover>
            )}
        </div>
    );
}
