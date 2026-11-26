import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { profileScoreQuery } from "@/api/queries";
import type { ScoreScope } from "@/api/stats";
import { Chip, Typography } from "@/ui";
import { TIERS, rankTone, tierIndex } from "../score-card/tiers";

import styles from "./styles.module.css";

export interface AvatarProps {
    name: string;
    level: number | null;
    scope: ScoreScope;
}

export function Avatar({ name, level, scope }: AvatarProps) {
    const t = useTranslations("profile.header");
    const { data } = useQuery(profileScoreQuery(scope));
    const score = data?.career ?? null;

    const tone =
        score === null ? undefined : rankTone(TIERS[tierIndex(score)].rank);

    return (
        <div
            className={styles.avatar}
            style={tone}
            data-ranked={score !== null || undefined}
        >
            <Typography as="span" display className={styles.initial}>
                {[...name][0]}
            </Typography>
            {level !== null && (
                // The chip's tint is translucent, so it sits on a solid backing
                // to hide the ring behind it.
                <span className={styles.level}>
                    <Chip size="sm" uppercase>
                        {t("level", { level })}
                    </Chip>
                </span>
            )}
        </div>
    );
}
