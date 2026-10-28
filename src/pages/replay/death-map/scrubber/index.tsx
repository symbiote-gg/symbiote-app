import classNames from "classnames";
import { Skull } from "lucide-react";
import type { CSSProperties, ChangeEvent, MouseEvent } from "react";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import { position } from "@/utils/timeline/layout";
import { AxisTimes } from "../../timeline/track/parts/axis-times";
import type { PlacedDeath } from "../deaths";

import styles from "./styles.module.css";

interface ScrubberProps {
    deaths: PlacedDeath[];
    time: number;
    duration: number;
    selectedId: number | null;
    allyTeam: number;
    text: TimelineText;
    onTickClick: (e: MouseEvent<HTMLButtonElement>) => void;
    onScrub: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function Scrubber({
    deaths,
    time,
    duration,
    selectedId,
    allyTeam,
    text,
    onTickClick,
    onScrub,
}: ScrubberProps) {
    const t = useTranslations("replay.deathMap");

    return (
        <div className={styles.root}>
            <div className={styles.axis}>
                <div className={styles.ticks}>
                    {deaths.map(({ id, entry }) => (
                        <button
                            key={id}
                            type="button"
                            tabIndex={-1}
                            data-death={id}
                            aria-label={text.entryLabel(entry)}
                            className={classNames(
                                styles.tick,
                                entry.team === allyTeam
                                    ? styles.ally
                                    : styles.enemy,
                                { [styles.selected]: id === selectedId },
                            )}
                            style={{ left: position(entry.time, duration) }}
                            onClick={onTickClick}
                        >
                            <Skull className={styles.skull} aria-hidden />
                        </button>
                    ))}
                </div>
            </div>
            <input
                type="range"
                min={0}
                max={Math.ceil(duration)}
                step={1}
                value={time}
                aria-label={t("scrub")}
                aria-valuetext={text.at(time)}
                className={styles.range}
                style={
                    {
                        "--progress": position(time, duration),
                    } as CSSProperties
                }
                onChange={onScrub}
            />
            <div className={styles.axis}>
                <AxisTimes duration={duration} text={text} />
            </div>
        </div>
    );
}
