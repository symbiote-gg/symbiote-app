import classNames from "classnames";

import styles from "./styles.module.css";

export interface KadProps {
    kills: number | null;
    assists: number | null;
    deaths: number | null;
}

export function Kad({ kills, assists, deaths }: KadProps) {
    if (kills === null && assists === null && deaths === null) return "-";

    return (
        <>
            <span className={styles.kills}>{kills ?? "-"}</span>
            <span className={styles.slash}>/</span>
            {assists ?? "-"}
            <span className={styles.slash}>/</span>
            <span
                className={classNames({
                    [styles.deaths]: !!deaths,
                    [styles.deathless]: deaths === 0,
                })}
            >
                {deaths ?? "-"}
            </span>
        </>
    );
}
