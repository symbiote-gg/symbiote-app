import classNames from "classnames";
import type { ReactNode } from "react";

import { useFormatStat } from "@/hooks/useFormatStat";

import styles from "./styles.module.css";

export type WinRateGrade =
    "great" | "good" | "even" | "poor" | "bad" | "unjudged";

const GREAT = 0.6;
const GOOD = 0.55;
const EVEN = 0.48;
const POOR = 0.43;

export function winRateGrade(rate: number, judged = true): WinRateGrade {
    if (!judged) return "unjudged";
    if (rate >= GREAT) return "great";
    if (rate >= GOOD) return "good";
    if (rate >= EVEN) return "even";
    if (rate >= POOR) return "poor";
    return "bad";
}

export interface WinRateProps {
    rate: number | null;
    /** False greys the rate out, for samples too small to grade. */
    judged?: boolean;
    /** Follows the rate in its color, like a "wins" label. */
    suffix?: ReactNode;
    className?: string;
}

/** Colors a win rate by grade and inherits everything else from its parent. */
export function WinRate({
    rate,
    judged = true,
    suffix,
    className,
}: WinRateProps) {
    const { winPercent } = useFormatStat();

    const grade = rate === null ? "unjudged" : winRateGrade(rate, judged);

    return (
        <span className={classNames(className, styles[grade])}>
            {winPercent(rate)}
            {suffix}
        </span>
    );
}
