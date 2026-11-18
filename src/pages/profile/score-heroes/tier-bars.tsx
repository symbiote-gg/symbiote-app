import { useTranslations } from "use-intl";

import { Typography } from "@/ui";
import { GemIcon } from "../score-card/gem";
import { TIERS, rankTone, tierBounds } from "../score-card/tiers";

import styles from "./styles.module.css";

export function TierBars() {
    const t = useTranslations("profile.score");

    return (
        <ol className={styles.tiers}>
            {TIERS.map(({ tier, rank }, index) => {
                const { kind, ...values } = tierBounds(index);

                return (
                    <li
                        key={tier}
                        className={styles.tier}
                        style={rankTone(rank)}
                    >
                        <span className={styles.bar} />
                        <div className={styles.tierLabel}>
                            <GemIcon className={styles.gem} aria-hidden />
                            <div className={styles.tierText}>
                                <Typography
                                    as="span"
                                    size="sm"
                                    weight="semibold"
                                    truncate
                                    className={styles.tierName}
                                >
                                    {t(`tier.${tier}`)}
                                </Typography>
                                <Typography
                                    as="span"
                                    size="xs"
                                    variant="tertiary"
                                    mono
                                >
                                    {t(`ladder.${kind}`, values)}
                                </Typography>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
