import {
    type CSSProperties,
    type ChangeEvent,
    type MouseEvent,
    type Ref,
    useImperativeHandle,
    useState,
} from "react";
import { useTranslations } from "use-intl";

import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import { position } from "@/utils/timeline/layout";
import { AxisTimes } from "../../timeline/track/parts/axis-times";
import type { PlacedDeath } from "../deaths";
import { Ticks } from "./ticks";

import styles from "./styles.module.css";

export interface ScrubberHandle {
    reach: (time: number) => void;
}

interface ScrubberProps {
    ref: Ref<ScrubberHandle>;
    deaths: PlacedDeath[];
    reached: number;
    duration: number;
    selectedId: number | null;
    allyTeam: number;
    ownerSlot: number;
    text: TimelineText;
    onTickClick: (e: MouseEvent<HTMLButtonElement>) => void;
    onTime: (time: number) => void;
}

export function Scrubber({
    ref,
    deaths,
    reached,
    duration,
    selectedId,
    allyTeam,
    ownerSlot,
    text,
    onTickClick,
    onTime,
}: ScrubberProps) {
    const t = useTranslations("replay.deathMap");

    const end = Math.ceil(duration);
    const [time, setTime] = useState(end);

    useImperativeHandle(
        ref,
        () => ({
            reach: (next) => setTime((current) => Math.max(current, next)),
        }),
        [],
    );

    const move = (next: number) => {
        setTime(next);
        onTime(next);
    };

    const onChange = (e: ChangeEvent<HTMLInputElement>) =>
        move(Number(e.target.value));

    const onBarClick = (e: MouseEvent<HTMLDivElement>) => {
        const box = e.currentTarget.getBoundingClientRect();

        move(Math.round(((e.clientX - box.left) / box.width) * end));
    };

    return (
        <div
            className={styles.root}
            style={{ "--at": position(time, duration) } as CSSProperties}
        >
            <div className={styles.axis}>
                <div className={styles.handles}>
                    {time < end && (
                        <Typography
                            as="span"
                            size="xs"
                            mono
                            className={styles.handle}
                        >
                            {text.at(time)}
                        </Typography>
                    )}
                </div>
            </div>
            <div className={styles.bar}>
                <div className={styles.track}>
                    <div
                        className={styles.hit}
                        aria-hidden
                        onClick={onBarClick}
                    />
                    <div className={styles.band} />
                    <div className={styles.line} />
                    <div className={styles.fill} />
                    <Ticks
                        deaths={deaths}
                        reached={reached}
                        duration={duration}
                        selectedId={selectedId}
                        allyTeam={allyTeam}
                        ownerSlot={ownerSlot}
                        text={text}
                        onTickClick={onTickClick}
                    />
                </div>
                <input
                    type="range"
                    min={0}
                    max={end}
                    step={1}
                    value={time}
                    aria-label={t("scrub")}
                    aria-valuetext={text.at(time)}
                    className={styles.range}
                    onChange={onChange}
                />
            </div>
            <div className={styles.axis}>
                <AxisTimes duration={duration} text={text} />
            </div>
        </div>
    );
}
