import classNames from "classnames";
import { useTranslations } from "use-intl";

import { Tooltip } from "@/ui";

import styles from "./styles.module.css";

export interface WinStripProps {
    results: (boolean | null)[];
    slots?: number;
    className?: string;
}

export function WinStrip({ results, slots = 0, className }: WinStripProps) {
    const t = useTranslations("result");
    const empty = Math.max(slots - results.length, 0);

    return (
        <div className={classNames(className, styles.root)}>
            {results.map((win, i) => {
                const result = win === null ? "unknown" : win ? "win" : "loss";
                return (
                    <Tooltip
                        key={i}
                        content={t(result)}
                        className={styles.trigger}
                    >
                        <span
                            className={classNames(styles.cell, styles[result])}
                            aria-label={t(result)}
                        />
                    </Tooltip>
                );
            })}
            {Array.from({ length: empty }, (_, i) => (
                <span
                    key={results.length + i}
                    className={classNames(styles.cell, styles.empty)}
                />
            ))}
        </div>
    );
}
