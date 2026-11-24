import {
    ChartColumn,
    Gamepad2,
    Info,
    type LucideIcon,
    RefreshCw,
    Scale,
    Timer,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslations } from "use-intl";

import type { PillarMax, ScoreScope } from "@/api/stats";
import { Meter, Tooltip, Typography } from "@/ui";
import { TIERS, rankTone, tierIndex } from "../tiers";

import styles from "./styles.module.css";

type Step = "games" | "rate" | "rank" | "weight" | "live";

const STEPS: { step: Step; icon: LucideIcon }[] = [
    { step: "games", icon: Gamepad2 },
    { step: "rate", icon: Timer },
    { step: "rank", icon: ChartColumn },
    { step: "weight", icon: Scale },
    { step: "live", icon: RefreshCw },
];

export interface MethodProps {
    scope: ScoreScope;
    /** `null` while unrated, which keeps the panel in the default accent. */
    score: number | null;
    maxes: PillarMax[];
}

export function Method({ scope, score: career, maxes }: MethodProps) {
    const t = useTranslations("profile.score.method");
    const names = useTranslations("profile.score.pillar");
    const body = (step: Step) =>
        step === "games" ? t(`steps.games.${scope}`) : t(`steps.${step}.body`);

    const rank = career === null ? null : TIERS[tierIndex(career)].rank;

    const heaviest = Math.max(...maxes.map(({ max }) => max));

    const lists: Partial<Record<Step, ReactNode>> = {
        weight: (
            <ul className={styles.weights}>
                {maxes.map(({ id, max }) => (
                    <li key={id} className={styles.weight}>
                        <Typography size="sm" variant="secondary" truncate>
                            {names(id)}
                        </Typography>
                        <span
                            className={styles.track}
                            style={
                                { "--weight": max / heaviest } as CSSProperties
                            }
                        >
                            <Meter
                                value={1}
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
                            {max}
                        </Typography>
                    </li>
                ))}
            </ul>
        ),
    };

    const panel = (
        <div
            className={styles.content}
            style={rank ? rankTone(rank) : undefined}
        >
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
                        {lists[step]}
                    </section>
                ))}
            </div>
            <Typography size="xs" variant="tertiary">
                {t("footnote")}
            </Typography>
        </div>
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
