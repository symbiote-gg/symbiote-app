import classNames from "classnames";
import { useFormatter } from "use-intl";

import { Eyebrow, Typography } from "@/ui";

import styles from "./styles.module.css";

interface StatProps {
    label: string;
    value: number;
    muted?: boolean;
}

export function Stat({ label, value, muted = false }: StatProps) {
    const format = useFormatter();

    return (
        <div className={styles.stat}>
            <Eyebrow>{label}</Eyebrow>
            <Typography
                size="sm"
                weight="semibold"
                mono
                className={classNames({ [styles.muted]: muted })}
            >
                {format.number(value, {
                    notation: "compact",
                    maximumFractionDigits: 1,
                })}
            </Typography>
        </div>
    );
}
