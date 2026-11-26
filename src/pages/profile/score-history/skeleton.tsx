import classNames from "classnames";
import { History as HistoryIcon } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "use-intl";

import {
    Card,
    CardHeader,
    ChipButton,
    ChipDivider,
    ChipGroup,
    Skeleton,
    Typography,
} from "@/ui";
import { axis } from "../score-heroes/swarm";
import { RECENT, type Range } from "./days";
import { Ticks } from "./ticks";

import styles from "./styles.module.css";

// The backend's recent window, which a rated player has almost always filled.
const RECENT_GAMES = 50;

const onRangeClick = () => {};

// The axis of a chart with no scores on it.
const AXIS = axis([]);

// A stand-in line, in the plot's 100 by 100 box.
const LINE =
    "M0,64 C7,60 11,50 18,52 S30,68 40,60 S54,38 63,44 S77,58 86,48 S95,40 100,42";
const AREA = `${LINE} L100,100 L0,100 Z`;
const END = { left: "100%", top: "42%" };

const LABELS = [8, 25, 42, 59, 76, 93];

export function HistorySkeleton() {
    const t = useTranslations("profile.score");
    const id = useId();

    const chip = (value: Range) => (
        <ChipButton
            key={value}
            pressed={value === "all"}
            disabled
            onClick={onRangeClick}
        >
            {t(`history.range.${value}`)}
        </ChipButton>
    );

    return (
        <Card>
            <CardHeader
                size="sm"
                icon={HistoryIcon}
                title={t("history.title")}
                subtitle={t("history.subtitle", { window: RECENT_GAMES })}
                wrap
                action={
                    <ChipGroup label={t("history.range.label")}>
                        {RECENT.map(chip)}
                        <ChipDivider />
                        {chip("all")}
                    </ChipGroup>
                }
            />
            <div className={styles.body}>
                <div className={styles.chart}>
                    <Ticks {...AXIS} />
                    <div className={styles.plot}>
                        <svg
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                            className={styles.line}
                            aria-hidden
                        >
                            <defs>
                                <linearGradient
                                    id={`${id}-fade`}
                                    x1={0}
                                    y1={0}
                                    x2={0}
                                    y2={1}
                                >
                                    <stop
                                        offset={0}
                                        className={styles.ghostTop}
                                    />
                                    <stop
                                        offset={1}
                                        className={styles.ghostBottom}
                                    />
                                </linearGradient>
                            </defs>
                            <path d={AREA} fill={`url(#${id}-fade)`} />
                            <path
                                d={LINE}
                                className={classNames(
                                    styles.stroke,
                                    styles.ghostStroke,
                                )}
                            />
                        </svg>
                        <span
                            className={classNames(styles.end, styles.ghostEnd)}
                            style={END}
                        />
                    </div>
                    <div className={styles.labels}>
                        {LABELS.map((left) => (
                            <Typography
                                key={left}
                                as="span"
                                size="xs"
                                mono
                                className={styles.label}
                                style={{ left: `${left}%` }}
                            >
                                <Skeleton className={styles.labelBar} />
                            </Typography>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}
