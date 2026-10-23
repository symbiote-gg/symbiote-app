import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import { axisTimes, position } from "@/utils/timeline/layout";

import styles from "./styles.module.css";

interface AxisTimesProps {
    duration: number;
    text: TimelineText;
}

export function AxisTimes({ duration, text }: AxisTimesProps) {
    return (
        <div className={styles.times}>
            {axisTimes(duration).map((time) => (
                <span
                    key={time}
                    className={styles.time}
                    style={{ left: position(time, duration) }}
                >
                    <Typography size="xs" variant="tertiary" mono>
                        {text.at(time)}
                    </Typography>
                </span>
            ))}
        </div>
    );
}
