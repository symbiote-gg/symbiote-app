import { useId } from "react";

import { AXIS, TRACK_HEIGHT } from "@/utils/timeline/constants";
import { type LevelCurve, leadPoints } from "@/utils/timeline/levels";

import styles from "./styles.module.css";

const PX_PER_LEVEL = 48;
const LEAD_LIMIT = AXIS - 12;

interface LeadProps {
    curves: [LevelCurve, LevelCurve];
    duration: number;
}

export function Lead({ curves, duration }: LeadProps) {
    const clipId = useId();

    const lead = leadPoints(curves, duration).map(
        ([time, levels]) =>
            `${time},${Math.max(Math.min(-levels * PX_PER_LEVEL, LEAD_LIMIT), -LEAD_LIMIT)}`,
    );
    const leadLine = `M${lead.join(" L")}`;
    const leadArea = `M0,0 L${lead.join(" L")} L${duration},0 Z`;

    return (
        <svg
            className={styles.lead}
            viewBox={`0 ${-AXIS} ${duration} ${TRACK_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden
        >
            <defs>
                <clipPath id={`${clipId}-above`}>
                    <rect x={0} y={-AXIS} width={duration} height={AXIS} />
                </clipPath>
                <clipPath id={`${clipId}-below`}>
                    <rect x={0} y={0} width={duration} height={AXIS} />
                </clipPath>
            </defs>
            <path
                d={leadArea}
                className={styles.leadAlly}
                clipPath={`url(#${clipId}-above)`}
            />
            <path
                d={leadArea}
                className={styles.leadEnemy}
                clipPath={`url(#${clipId}-below)`}
            />
            <path d={leadLine} className={styles.leadLine} />
        </svg>
    );
}
