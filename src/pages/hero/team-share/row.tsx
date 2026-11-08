import { useFormatStat } from "@/hooks/useFormatStat";
import { Meter, Tooltip, Typography } from "@/ui";

import styles from "./styles.module.css";

export interface RowProps {
    label: string;
    share: number;
    hint: string;
    muted: boolean;
}

export function Row({ label, share, hint, muted }: RowProps) {
    const { percent } = useFormatStat();

    return (
        <li className={styles.row}>
            <Typography as="span" size="sm" truncate>
                {label}
            </Typography>
            <Meter
                value={share}
                color={muted ? "muted" : "accent"}
                className={styles.meter}
            />
            <Tooltip content={hint} className={styles.share}>
                <Typography as="span" size="xs" weight="semibold" mono noWrap>
                    {percent(share)}
                </Typography>
            </Tooltip>
        </li>
    );
}
