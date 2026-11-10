import { useFormatStat } from "@/hooks/useFormatStat";
import { Eyebrow, Meter, Typography } from "@/ui";

import styles from "./styles.module.css";

export interface TileProps {
    label: string;
    share: number;
    detail: string;
}

export function Tile({ label, share, detail }: TileProps) {
    const { percent } = useFormatStat();

    return (
        <li className={styles.tile}>
            <Eyebrow as="h3" truncate>
                {label}
            </Eyebrow>
            <span className={styles.stats}>
                <span className={styles.figures}>
                    <Typography as="span" display className={styles.share}>
                        {percent(share)}
                    </Typography>
                    <Typography as="span" size="xs" variant="secondary">
                        {detail}
                    </Typography>
                </span>
                <Meter
                    value={share}
                    color="accent"
                    track="muted"
                    className={styles.meter}
                />
            </span>
        </li>
    );
}
