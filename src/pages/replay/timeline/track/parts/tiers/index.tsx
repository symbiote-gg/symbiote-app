import classNames from "classnames";
import { useTranslations } from "use-intl";

import { AXIS, AXIS_GAP } from "@/utils/timeline/constants";
import { position } from "@/utils/timeline/layout";
import { type LevelCurve, tiersReached } from "@/utils/timeline/levels";
import { sideClasses } from "../../../../side";

import styles from "./styles.module.css";

interface TiersProps {
    curves: [LevelCurve, LevelCurve];
    duration: number;
}

export function Tiers({ curves, duration }: TiersProps) {
    const t = useTranslations("replay.timeline");

    return tiersReached(curves, duration).map((reached) => (
        <span
            key={`${reached.side}-${reached.level}`}
            className={classNames(
                styles.levelLine,
                sideClasses(reached.side),
                reached.side === "ally"
                    ? styles.levelLineAlly
                    : styles.levelLineEnemy,
            )}
            style={{
                left: position(reached.time, duration),
                ...(reached.side === "ally"
                    ? { height: AXIS - AXIS_GAP }
                    : { top: AXIS + AXIS_GAP }),
            }}
        >
            <span
                className={classNames(
                    styles.tier,
                    reached.side === "ally"
                        ? styles.tierAlly
                        : styles.tierEnemy,
                )}
            >
                <span className={styles.tierLevel}>
                    {t.rich("tier.level", {
                        level: reached.level,
                        label: (chunks) => (
                            <span className={styles.tierLabel}>{chunks}</span>
                        ),
                    })}
                </span>
                {reached.secondsAhead > 0 && (
                    <span className={styles.tierAhead}>
                        {t("tier.ahead", { seconds: reached.secondsAhead })}
                    </span>
                )}
            </span>
        </span>
    ));
}
