import classNames from "classnames";
import type { ReactNode } from "react";

import { useFormatStat } from "@/hooks/useFormatStat";
import { RollingNumber } from "../rolling-number";

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
    judged?: boolean;
    suffix?: ReactNode;
    className?: string;
}

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
            <RollingNumber value={winPercent(rate)} />
            {suffix}
        </span>
    );
}
