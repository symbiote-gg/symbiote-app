import classNames from "classnames";
import {
    ChartColumn,
    Gamepad2,
    Info,
    type LucideIcon,
    Scale,
    Timer,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { useTranslations } from "use-intl";

import type { ScoreScope } from "@/api/stats";
import { useDismiss } from "@/hooks/useDismiss";
import { useFormatStat } from "@/hooks/useFormatStat";
import { Button, Chip, Meter, Popover, Typography } from "@/ui";
import { EXAMPLE, weightPercents } from "./example";

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

export interface MethodProps {
    scope: ScoreScope;
    // Absent while the score loads, when the trigger holds its place disabled.
    recent?: number;
}

export function Method({ scope, recent }: MethodProps) {
    const t = useTranslations("profile.score.method");
    const names = useTranslations("replay.rolePerformances.stat");
    const { compact, percent } = useFormatStat();
    const id = useId();
    const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);

    const onToggle = () => {
        setOpen((value) => !value);
    };

    const onClose = () => {
        setOpen(false);
    };

    useDismiss(open, anchor, onClose);

    const body = (step: Step, recent: number) =>
        step === "games"
            ? t(`steps.games.${scope}`)
            : t(`steps.${step}.body`, { window: recent });

    const games = [
        { key: "draft", counted: scope !== "quickMatch" },
        { key: "quickMatch", counted: scope !== "draft" },
        { key: "aram", counted: false },
        { key: "short", counted: false },
    ] as const;

    const healing = EXAMPLE.stats[0];
    const percents = weightPercents();

    const examples: Record<Step, ReactNode> = {
        games: (
            <div className={styles.chips}>
                {games.map(({ key, counted }) => (
                    <Chip
                        key={key}
                        size="sm"
                        tone={counted ? "win" : "neutral"}
                        className={classNames({ [styles.struck]: !counted })}
                    >
                        {t(`example.games.${key}`)}
                    </Chip>
                ))}
            </div>
        ),
        rate: (
            <Typography size="sm" variant="secondary" className={styles.box}>
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
            <div className={classNames(styles.box, styles.rank)}>
                <div className={styles.rankHead}>
                    <Typography size="sm" variant="secondary">
                        {t("example.rank")}
                    </Typography>
                    <Typography
                        as="span"
                        size="sm"
                        className={classNames(styles.mono, styles.accent)}
                    >
                        {t("example.beat", { share: percent(healing.beat) })}
                    </Typography>
                </div>
                <Meter
                    value={healing.beat}
                    color="accent"
                    size="md"
                    className={styles.meter}
                />
            </div>
        ),
        weight: (
            <ul className={classNames(styles.box, styles.weights)}>
                {EXAMPLE.stats.map(({ stat }, index) => (
                    <li key={stat} className={styles.weight}>
                        <Typography size="sm" variant="secondary" truncate>
                            {names(stat)}
                        </Typography>
                        <Meter
                            value={percents[index] / percents[0]}
                            color="mvp"
                            size="md"
                            className={styles.meter}
                        />
                        <Typography
                            as="span"
                            size="sm"
                            weight="semibold"
                            mono
                            className={styles.share}
                        >
                            {percent(percents[index] / 100)}
                        </Typography>
                    </li>
                ))}
            </ul>
        ),
    };

    return (
        <>
            <Button
                ref={setAnchor}
                type="button"
                variant="secondary"
                size="icon"
                disabled={recent === undefined}
                aria-label={t("trigger")}
                aria-expanded={open}
                aria-controls={open ? id : undefined}
                onClick={onToggle}
            >
                <Info aria-hidden />
            </Button>
            {open && recent !== undefined && (
                <Popover
                    anchor={anchor}
                    placement="bottom-start"
                    id={id}
                    role="dialog"
                    aria-label={t("title")}
                    className={styles.panel}
                >
                    <div className={styles.head}>
                        <Typography weight="semibold">{t("title")}</Typography>
                        <Typography size="sm" variant="tertiary">
                            {t("subtitle")}
                        </Typography>
                    </div>
                    <ol className={styles.steps}>
                        {STEPS.map(({ step, icon: Icon }) => (
                            <li key={step} className={styles.step}>
                                <div className={styles.marker}>
                                    <span className={styles.tile}>
                                        <Icon size={18} aria-hidden />
                                    </span>
                                    <span className={styles.rail} />
                                </div>
                                <div className={styles.text}>
                                    <Typography weight="semibold">
                                        {t(`steps.${step}.title`)}
                                    </Typography>
                                    <Typography size="sm" variant="secondary">
                                        {body(step, recent)}
                                    </Typography>
                                    {examples[step]}
                                </div>
                            </li>
                        ))}
                    </ol>
                </Popover>
            )}
        </>
    );
}
