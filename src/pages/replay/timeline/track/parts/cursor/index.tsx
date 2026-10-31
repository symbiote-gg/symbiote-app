import classNames from "classnames";
import { type Ref, useImperativeHandle, useState } from "react";

import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import { position } from "@/utils/timeline/layout";

import styles from "./styles.module.css";

export interface CursorHandle {
    move: (time: number | null) => void;
}

interface CursorProps {
    ref: Ref<CursorHandle>;
    duration: number;
    text: TimelineText;
}

export function Cursor({ ref, duration, text }: CursorProps) {
    const [time, setTime] = useState<number | null>(null);

    useImperativeHandle(ref, () => ({ move: setTime }), []);

    if (time === null) return <div className={styles.overlay} />;

    const left = position(time, duration);

    return (
        <div className={styles.overlay}>
            <span className={styles.crosshair} style={{ left }} />
            <div
                className={classNames(styles.tooltip, {
                    [styles.tooltipLeft]: time > duration / 2,
                })}
                style={{ left }}
            >
                <Typography size="xs" weight="semibold" noWrap>
                    {text.at(time)}
                </Typography>
            </div>
        </div>
    );
}
