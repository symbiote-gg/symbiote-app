import { useTranslations } from "use-intl";

import { Meter, Typography } from "@/ui";
import { GemIcon } from "../gem";
import { TIERS, rankTone, tierBounds, tierIndex, tierRange } from "../tiers";

import styles from "./styles.module.css";

type TierState = "passed" | "current" | "ahead";

export interface LadderProps {
    score: number | null;
}

export function Ladder({ score }: LadderProps) {
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

    // How far into its own range the score sits, so the bar reads as one scale.
    const fill = (index: number, state: TierState | undefined) => {
        if (state === "passed") return 1;
        if (state !== "current" || score === null) return 0;

        const { min, max } = tierRange(index);
        return (score - min) / (max - min);
    };

    return (
        <ul aria-label={t("ladder.label")} className={styles.root}>
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
                        <Meter
                            value={fill(index, state)}
                            color="accent"
                            size="md"
                            className={styles.segment}
                        />
                        <div className={styles.label}>
                            <GemIcon className={styles.gem} aria-hidden />
                            <div className={styles.text}>
                                <Typography
                                    as="span"
                                    size="sm"
                                    weight="semibold"
                                    truncate
                                    className={styles.name}
                                >
                                    {t(`tier.${tier}`)}
                                </Typography>
                                <Typography
                                    as="span"
                                    size="xs"
                                    variant="tertiary"
                                    mono
                                >
                                    {range(index)}
                                </Typography>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
