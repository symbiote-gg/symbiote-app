import { useFormatStat } from "@/hooks/useFormatStat";
import { Meter, Tooltip, Typography } from "@/ui";

import styles from "./styles.module.css";

export interface RowProps {
    label: string;
    value: string;
    share: number | null;
    hint: string | null;
    muted: boolean;
}

export function Row({ label, value, share, hint, muted }: RowProps) {
    const { percent } = useFormatStat();

    return (
        <li className={styles.row}>
            <Typography as="span" size="sm" truncate>
                {label}
            </Typography>
            {share === null ? (
                <span />
            ) : (
                <Meter
                    value={share}
                    color={muted ? "muted" : "accent"}
                    className={styles.meter}
                />
            )}
            <Typography
                as="span"
                size="xs"
                weight="semibold"
                mono
                noWrap
                className={styles.value}
            >
                {value}
            </Typography>
            {share === null || hint === null ? (
                <span />
            ) : (
                <Tooltip content={hint} className={styles.share}>
                    <Typography
                        as="span"
                        size="xs"
                        variant="tertiary"
                        mono
                        noWrap
                    >
                        {percent(share)}
                    </Typography>
                </Tooltip>
            )}
        </li>
    );
}
