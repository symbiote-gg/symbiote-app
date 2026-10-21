import { Hourglass } from "lucide-react";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { Gauge, GaugeBadge, GaugeValue } from "../gauge";

import styles from "./styles.module.css";

const FULL_BAR_SECONDS = 90;

interface LifeBarProps {
    seconds: number;
    start: string;
    end: string;
}

/** A summon's or a hold's length against {@link FULL_BAR_SECONDS}. */
export function LifeBar({ seconds, start, end }: LifeBarProps) {
    const t = useTranslations("replay.timeline");

    return (
        <div className={styles.life}>
            <GaugeBadge>
                <Hourglass aria-hidden />
            </GaugeBadge>
            <div className={styles.bar}>
                <Gauge
                    percent={Math.min(seconds / FULL_BAR_SECONDS, 1) * 100}
                />
                <span className={styles.times}>
                    <span>{start}</span>
                    <span>{end}</span>
                </span>
            </div>
            <GaugeValue>
                <Typography size="xs" weight="semibold" mono>
                    {t("detail.seconds", { value: seconds })}
                </Typography>
            </GaugeValue>
        </div>
    );
}
