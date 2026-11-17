import classNames from "classnames";
import {
    ChartColumn,
    Gamepad2,
    Info,
    type LucideIcon,
    Scale,
    Timer,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "use-intl";

import type { ScoreScope } from "@/api/stats";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Meter, Tooltip, Typography } from "@/ui";
import { EXAMPLE, PILLAR_MAXES, examplePoints } from "./example";

import styles from "./styles.module.css";

type Step = "games" | "rate" | "rank" | "weight";

const STEPS: { step: Step; icon: LucideIcon }[] = [
    { step: "games", icon: Gamepad2 },
    { step: "rate", icon: Timer },
    { step: "rank", icon: ChartColumn },
    { step: "weight", icon: Scale },
];

const richMono = (chunks: ReactNode) => (
    <span className={styles.mono}>{chunks}</span>
);

const richAccent = (chunks: ReactNode) => (
    <span className={classNames(styles.mono, styles.accent)}>{chunks}</span>
);

const richPoints = (chunks: ReactNode) => (
    <span className={styles.points}>{chunks}</span>
);

const richMax = (chunks: ReactNode) => (
    <span className={styles.max}>{chunks}</span>
);

export interface MethodProps {
    scope: ScoreScope;
}

export function Method({ scope }: MethodProps) {
    const t = useTranslations("profile.score.method");
    const score = useTranslations("profile.score");
    const names = useTranslations("profile.score.pillar");
    const { compact, percent } = useFormatStat();
    const body = (step: Step) =>
        step === "games"
            ? t(`steps.games.${scope}`)
            : t(`steps.${step}.body`, PILLAR_MAXES);

    const maxes = EXAMPLE.pillars.map(({ pillar }) => PILLAR_MAXES[pillar]);
    const points = examplePoints(maxes);
    const total = points.reduce((sum, value) => sum + value, 0);

    const pointsOf = (value: number, max: number) =>
        score.rich("points", {
            points: value,
            max,
            b: richPoints,
            of: richMax,
        });

    const examples: Partial<Record<Step, ReactNode>> = {
        rate: (
            <Typography size="sm" variant="secondary">
                {t.rich("example.rate", {
                    total: compact(EXAMPLE.healing),
                    minutes: EXAMPLE.minutes,
                    perMinute: compact(EXAMPLE.healing / EXAMPLE.minutes),
                    mono: richMono,
                    accent: richAccent,
                })}
            </Typography>
        ),
        rank: (
            <Typography size="sm" variant="secondary">
                {t.rich("example.rank", {
                    share: percent(EXAMPLE.healingBeat),
                    accent: richAccent,
                })}
            </Typography>
        ),
        weight: (
            <ul className={styles.weights}>
                {EXAMPLE.pillars.map(({ pillar }, index) => (
                    <li key={pillar} className={styles.weight}>
                        <Typography size="sm" variant="secondary" truncate>
                            {names(pillar)}
                        </Typography>
                        <span
                            className={styles.track}
                            style={
                                {
                                    "--weight": maxes[index] / maxes[0],
                                } as CSSProperties
                            }
                        >
                            <Meter
                                value={points[index] / maxes[index]}
                                color="accent"
                                size="md"
                                className={styles.meter}
                            />
                        </span>
                        <Typography
                            as="span"
                            size="sm"
                            mono
                            noWrap
                            className={styles.value}
                        >
                            {pointsOf(points[index], maxes[index])}
                        </Typography>
                    </li>
                ))}
                <li className={classNames(styles.weight, styles.total)}>
                    <Typography size="sm" weight="semibold">
                        {t("example.total")}
                    </Typography>
                    <Typography
                        as="span"
                        size="sm"
                        mono
                        noWrap
                        className={styles.value}
                    >
                        {pointsOf(total, 100)}
                    </Typography>
                </li>
            </ul>
        ),
    };

    const panel = (
        <>
            <div className={styles.head}>
                <Typography weight="semibold">{t("title")}</Typography>
                <Typography size="sm" variant="tertiary">
                    {t("subtitle")}
                </Typography>
            </div>
            <div className={styles.group}>
                {STEPS.map(({ step, icon: Icon }) => (
                    <section key={step} className={styles.section}>
                        <div className={styles.label}>
                            <Icon className={styles.icon} aria-hidden />
                            <Typography
                                size="xs"
                                weight="semibold"
                                uppercase
                                noWrap
                                className={styles.labelText}
                            >
                                {t(`steps.${step}.label`)}
                            </Typography>
                        </div>
                        <Typography size="sm" variant="secondary">
                            {body(step)}
                        </Typography>
                        {examples[step]}
                    </section>
                ))}
            </div>
            <Typography size="xs" variant="tertiary">
                {t("footnote")}
            </Typography>
        </>
    );

    return (
        <Tooltip
            content={panel}
            placement="right"
            compact={false}
            panelClassName={styles.panel}
        >
            <Info
                tabIndex={0}
                aria-label={t("trigger")}
                className={styles.trigger}
            />
        </Tooltip>
    );
}
