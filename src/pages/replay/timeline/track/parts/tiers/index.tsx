import classNames from "classnames";
import { useTranslations } from "use-intl";

import { position } from "@/utils/timeline/layout";
import {
    type LevelCurve,
    type TierReached,
    tiersReached,
} from "@/utils/timeline/levels";

import styles from "./styles.module.css";

interface TiersProps {
    curves: [LevelCurve, LevelCurve];
    duration: number;
}

export function Tiers({ curves, duration }: TiersProps) {
    const t = useTranslations("replay.timeline");

    const reachedText = ({ level, secondsAhead }: TierReached) =>
        secondsAhead > 0
            ? t("tier.ahead", { level, seconds: secondsAhead })
            : t("tier.reached", { level });

    return tiersReached(curves, duration).map((reached) => (
        <span
            key={`${reached.side}-${reached.level}`}
            className={classNames(
                styles.levelLine,
                reached.side === "ally"
                    ? styles.levelLineAlly
                    : styles.levelLineEnemy,
            )}
            style={{ left: position(reached.time, duration) }}
        >
            <span
                className={classNames(
                    styles.tier,
                    reached.side === "ally"
                        ? styles.tierAlly
                        : styles.tierEnemy,
                )}
            >
                {reachedText(reached)}
            </span>
        </span>
    ));
}
