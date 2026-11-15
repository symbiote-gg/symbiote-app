import { useTranslations } from "use-intl";

import { Eyebrow, Skeleton, Typography } from "@/ui";
import { GemIcon } from "../gem";
import { TIERS, rankTone, tierBounds, tierIndex } from "../tiers";

import styles from "./styles.module.css";

type TierState = "passed" | "current" | "ahead";

export interface LadderProps {
    score: number | null;
    loading?: boolean;
}

export function Ladder({ score, loading }: LadderProps) {
    const t = useTranslations("profile.score");
    const current = score === null ? null : tierIndex(score);

    const range = (index: number) => {
        const { kind, ...values } = tierBounds(index);

        return t(`ladder.${kind}`, values);
    };

    const stateOf = (index: number): TierState | undefined => {
        if (current === null) return undefined;
        if (index < current) return "passed";
        if (index === current) return "current";
        return "ahead";
    };

    const status = (index: number, state: TierState | undefined) => {
        if (state === undefined || score === null) return t("ladder.unrated");
        if (state === "passed") return t("ladder.passed");
        if (state === "ahead")
            return t("ladder.toGo", { points: TIERS[index].from - score });
        return t("ladder.here");
    };

    return (
        <div className={styles.root}>
            <ul aria-label={t("ladder.label")} className={styles.tiers}>
                {TIERS.map(({ tier, rank }, index) => {
                    const state = stateOf(index);

                    return (
                        <li
                            key={tier}
                            className={styles.tier}
                            style={rankTone(rank)}
                            data-state={state}
                            aria-current={state === "current" || undefined}
                        >
                            <div className={styles.badge}>
                                <GemIcon className={styles.gem} aria-hidden />
                                <span className={styles.pips} aria-hidden>
                                    {TIERS.slice(0, index + 1).map((step) => (
                                        <span
                                            key={step.tier}
                                            className={styles.pip}
                                        />
                                    ))}
                                </span>
                            </div>
                            <div className={styles.text}>
                                <Eyebrow className={styles.name}>
                                    {t(`tier.${tier}`)}
                                </Eyebrow>
                                <Typography size="xs" variant="secondary" mono>
                                    {range(index)}
                                </Typography>
                                {loading ? (
                                    <Typography size="xs" variant="tertiary">
                                        <Skeleton
                                            className={styles.statusBar}
                                        />
                                    </Typography>
                                ) : (
                                    <Typography size="xs" variant="tertiary">
                                        {status(index, state)}
                                    </Typography>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
