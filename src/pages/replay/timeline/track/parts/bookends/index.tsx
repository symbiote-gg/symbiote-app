import classNames from "classnames";
import { DoorOpen, Trophy } from "lucide-react";
import { type PointerEvent, useState } from "react";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import { Popover } from "@/ui";
import { AXIS } from "@/utils/timeline/constants";
import type { Side } from "@/utils/timeline/types";
import { HeaderText } from "../../../popover/header/header-text";
import { sideClass } from "../../../side";

import styles from "./styles.module.css";

export type Bookend = "start" | "end";

interface BookendsProps {
    winner: Side;
    duration: number;
    text: TimelineText;
    open: Bookend | null;
    onPointerEnter: (e: PointerEvent<HTMLButtonElement>) => void;
    onPointerLeave: () => void;
    onPopoverEnter: () => void;
}

export function Bookends({
    winner,
    duration,
    text,
    open,
    onPointerEnter,
    onPointerLeave,
    onPopoverEnter,
}: BookendsProps) {
    const t = useTranslations("replay.timeline");
    const [start, setStart] = useState<HTMLButtonElement | null>(null);
    const [end, setEnd] = useState<HTMLButtonElement | null>(null);

    const gatesOpen = t("gatesOpen");
    const ended = t("gameEnded", { side: winner ?? "none" });

    const side = open === "end" ? winner : null;
    const Icon = open === "end" ? Trophy : DoorOpen;

    return (
        <>
            <span className={styles.axis} style={{ top: AXIS }} />
            <button
                ref={setStart}
                type="button"
                data-bookend="start"
                tabIndex={-1}
                aria-label={gatesOpen}
                aria-expanded={open === "start"}
                className={classNames(styles.bookend, sideClass(null), {
                    [styles.open]: open === "start",
                })}
                style={{ left: 0, top: AXIS }}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
            >
                <DoorOpen className={styles.bookendIcon} aria-hidden />
            </button>
            <button
                ref={setEnd}
                type="button"
                data-bookend="end"
                tabIndex={-1}
                aria-label={ended}
                aria-expanded={open === "end"}
                className={classNames(styles.bookend, sideClass(winner), {
                    [styles.open]: open === "end",
                })}
                style={{ left: "100%", top: AXIS }}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
            >
                <Trophy className={styles.bookendIcon} aria-hidden />
            </button>
            {open && (
                <Popover
                    key={open}
                    anchor={open === "start" ? start : end}
                    placement={open === "start" ? "right" : "left"}
                    role="dialog"
                    aria-label={open === "start" ? gatesOpen : ended}
                    className={styles.popover}
                    onPointerEnter={onPopoverEnter}
                    onPointerLeave={onPointerLeave}
                >
                    <header className={styles.header}>
                        <Icon
                            className={classNames(styles.icon, sideClass(side))}
                            aria-hidden
                        />
                        <HeaderText
                            title={open === "start" ? gatesOpen : ended}
                            meta={text.at(open === "start" ? 0 : duration)}
                        />
                    </header>
                </Popover>
            )}
        </>
    );
}
