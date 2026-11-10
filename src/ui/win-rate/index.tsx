import classNames from "classnames";
import type { ReactNode } from "react";

import { useFormatStat } from "@/hooks/useFormatStat";
import { RollingNumber } from "../rolling-number";
import { winRateGrade } from "./grade";

import styles from "./styles.module.css";

export interface WinRateProps {
    rate: number | null;
    judged?: boolean;
    suffix?: ReactNode;
    rolling?: boolean;
    className?: string;
}

export function WinRate({
    rate,
    judged = true,
    suffix,
    rolling = true,
    className,
}: WinRateProps) {
    const { winPercent } = useFormatStat();

    const grade = rate === null ? "unjudged" : winRateGrade(rate, judged);

    return (
        <span className={classNames(className, styles[grade])}>
            {rolling ? (
                <RollingNumber value={winPercent(rate)} />
            ) : (
                winPercent(rate)
            )}
            {suffix}
        </span>
    );
}
