import classNames from "classnames";

import { useFormatStat } from "@/hooks/useFormatStat";
import { Stat as BaseStat } from "@/ui";

import styles from "./styles.module.css";

interface StatProps {
    label: string;
    value: number;
    muted?: boolean;
}

export function Stat({ label, value, muted = false }: StatProps) {
    const { compact } = useFormatStat();

    return (
        <BaseStat
            label={label}
            size="sm"
            className={styles.stat}
            valueClassName={classNames({ [styles.muted]: muted })}
        >
            {compact(value)}
        </BaseStat>
    );
}
