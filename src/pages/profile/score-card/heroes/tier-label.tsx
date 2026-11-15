import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { GemIcon } from "../gem";
import { TIERS, rankTone, tierBounds } from "../tiers";

import styles from "./styles.module.css";

export function HeroesHeader() {
    const t = useTranslations("profile.score");

    return (
        <div className={styles.heading}>
            <Typography size="lg" weight="semibold">
                {t("heroes.title")}
            </Typography>
            <Typography size="sm" variant="tertiary">
                {t("heroes.subtitle")}
            </Typography>
        </div>
    );
}

export interface TierLabelProps {
    index: number;
    filled: boolean;
    children: ReactNode;
}

/** One rating's row: its gem, name and range, then what sits in it. */
export function TierLabel({ index, filled, children }: TierLabelProps) {
    const t = useTranslations("profile.score");
    const { tier, rank } = TIERS[index];
    const { kind, ...values } = tierBounds(index);

    return (
        <li
            className={styles.tier}
            style={rankTone(rank)}
            data-filled={filled || undefined}
        >
            <div className={styles.label}>
                <GemIcon className={styles.gem} aria-hidden />
                <div className={styles.text}>
                    <Typography
                        size="sm"
                        weight="semibold"
                        className={styles.tierName}
                    >
                        {t(`tier.${tier}`)}
                    </Typography>
                    <Typography size="xs" variant="secondary" mono>
                        {t(`ladder.${kind}`, values)}
                    </Typography>
                </div>
            </div>
            <div className={styles.chips}>{children}</div>
        </li>
    );
}
