import { Typography } from "@/ui";
import { GemIcon } from "../score-card/gem";
import { TIERS, rankTone, tierIndex } from "../score-card/tiers";

import styles from "./styles.module.css";

export interface TicksProps {
    low: number;
    high: number;
}

export function Ticks({ low, high }: TicksProps) {
    const ticks = TIERS.slice(1)
        .map(({ from }) => from)
        .filter((from) => from >= low && from <= high);

    return (
        <div className={styles.ticks}>
            {ticks.map((tick) => (
                <span
                    key={tick}
                    className={styles.tick}
                    style={{
                        ...rankTone(TIERS[tierIndex(tick)].rank),
                        top: `${((high - tick) / (high - low)) * 100}%`,
                    }}
                >
                    <GemIcon className={styles.tickGem} />
                    <Typography as="span" size="xs" variant="tertiary" mono>
                        {tick}
                    </Typography>
                </span>
            ))}
        </div>
    );
}
