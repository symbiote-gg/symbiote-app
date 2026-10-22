import classNames from "classnames";
import type { FocusEvent, MouseEvent, PointerEvent } from "react";

import type { TimelineText } from "@/hooks/useTimelineText";
import { fightGlyph, tickGlyph } from "@/utils/timeline/glyphs";
import { fightSize, position } from "@/utils/timeline/layout";
import { isBandMarker } from "@/utils/timeline/markers";
import type { DeathEntry, Marker } from "@/utils/timeline/types";
import { GlyphIcon } from "../../../glyphs";
import { sideClass } from "../../../side";

import styles from "./styles.module.css";

interface MarkContentProps {
    marker: Marker;
    longGame: boolean;
    text: TimelineText;
}

function MarkContent({ marker, longGame, text }: MarkContentProps) {
    switch (marker.shape) {
        case "kill":
            return (
                <GlyphIcon
                    glyph={fightGlyph(marker.entries as DeathEntry[])}
                    className={styles.glyph}
                />
            );
        case "fight":
            return <GlyphIcon glyph="swords" className={styles.glyph} />;
        case "boss":
            return <GlyphIcon glyph="crown" className={styles.glyph} />;
        case "fort":
            return <GlyphIcon glyph="castle" className={styles.glyph} />;
        case "keep":
            return <GlyphIcon glyph="keep" className={styles.glyph} />;
        case "objective":
            return (
                <>
                    <GlyphIcon glyph={marker.glyph} className={styles.glyph} />
                    {!longGame && text.objectiveLabel(marker)}
                </>
            );
        default:
            return null;
    }
}

function TickVisual({ marker }: { marker: Marker }) {
    if (marker.shape === "spawn")
        return (
            <span
                className={classNames(
                    styles.tickVisual,
                    styles.tickBadge,
                    styles.spawn,
                )}
            >
                <GlyphIcon glyph={marker.glyph} className={styles.tickIcon} />
            </span>
        );

    if (marker.shape === "camp" || marker.shape === "dot")
        return (
            <span
                className={classNames(
                    styles.tickVisual,
                    styles.tickBadge,
                    sideClass(marker.side),
                    {
                        [styles.merged]: marker.merged,
                        [styles.minor]: marker.entries.every(
                            (entry) => entry.type === "camp",
                        ),
                    },
                )}
            >
                <GlyphIcon
                    glyph={tickGlyph(marker.entries)}
                    className={styles.tickIcon}
                />
                {marker.entries.length > 1 && (
                    <span className={styles.tickCount}>
                        {marker.entries.length}
                    </span>
                )}
            </span>
        );

    return (
        <span
            className={classNames(
                styles.tickVisual,
                styles[marker.shape],
                sideClass(marker.side),
                { [styles.merged]: "merged" in marker && marker.merged },
            )}
        />
    );
}

interface MarkerButtonProps {
    marker: Marker;
    top: number;
    duration: number;
    longGame: boolean;
    text: TimelineText;
    tabbable: boolean;
    selected: boolean;
    mine: boolean;
    dimmed: boolean;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    onPointerEnter: (e: PointerEvent<HTMLButtonElement>) => void;
    onPointerLeave: (e: PointerEvent<HTMLButtonElement>) => void;
    onFocus: (e: FocusEvent<HTMLButtonElement>) => void;
}

export function MarkerButton({
    marker,
    top,
    duration,
    longGame,
    text,
    tabbable,
    selected,
    mine,
    dimmed,
    onClick,
    onPointerEnter,
    onPointerLeave,
    onFocus,
}: MarkerButtonProps) {
    const band = isBandMarker(marker);
    const left = position(marker.time, duration);

    return (
        <button
            type="button"
            data-id={marker.id}
            tabIndex={tabbable ? 0 : -1}
            aria-label={text.markerLabel(marker)}
            aria-expanded={selected}
            className={classNames(
                band ? [styles.mark, styles[marker.shape]] : styles.tick,
                sideClass(marker.side),
                {
                    [styles.selected]: selected,
                    [styles.mine]: mine,
                    [styles.dimmed]: dimmed,
                },
            )}
            style={{
                ...(marker.shape === "objective" ? { "--x": left } : { left }),
                top,
                ...(marker.shape === "fight" && {
                    "--size": `${fightSize(marker.participants)}px`,
                }),
            }}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onFocus={onFocus}
        >
            {band ? (
                <MarkContent marker={marker} longGame={longGame} text={text} />
            ) : (
                <TickVisual marker={marker} />
            )}
        </button>
    );
}
