import { Skeleton, Typography } from "@/ui";
import { TIERS } from "../tiers";
import { HeroesHeader, TierLabel } from "./tier-label";

import styles from "./styles.module.css";

// Placeholder chips per rating, best first: the middle ones fill.
const CHIPS = [0, 0, 2, 3, 1, 0];

export function HeroTiersSkeleton() {
    return (
        <div className={styles.root}>
            <HeroesHeader />
            <ul className={styles.tiers}>
                {CHIPS.map((count, index) => {
                    const tier = TIERS.length - 1 - index;

                    return (
                        <TierLabel key={tier} index={tier} filled={count > 0}>
                            {count === 0 ? (
                                <Typography size="sm">
                                    <Skeleton className={styles.emptyBar} />
                                </Typography>
                            ) : (
                                Array.from({ length: count }, (_, chip) => (
                                    <div key={chip} className={styles.chip}>
                                        <Skeleton
                                            className={styles.portraitBar}
                                        />
                                        <div className={styles.names}>
                                            <Typography size="sm">
                                                <Skeleton
                                                    className={styles.nameBar}
                                                />
                                            </Typography>
                                            <Typography size="sm">
                                                <Skeleton
                                                    className={styles.gamesBar}
                                                />
                                            </Typography>
                                        </div>
                                        <Typography size="xl2" mono>
                                            <Skeleton
                                                className={styles.scoreBar}
                                            />
                                        </Typography>
                                    </div>
                                ))
                            )}
                        </TierLabel>
                    );
                })}
            </ul>
        </div>
    );
}
