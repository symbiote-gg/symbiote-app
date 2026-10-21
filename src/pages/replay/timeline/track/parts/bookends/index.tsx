import classNames from "classnames";
import { DoorOpen, Trophy } from "lucide-react";
import { useTranslations } from "use-intl";

import { AXIS } from "@/utils/timeline/constants";
import type { Side } from "@/utils/timeline/types";
import { sideClass } from "../../../side";

import styles from "./styles.module.css";

interface BookendsProps {
    winner: Side;
}

export function Bookends({ winner }: BookendsProps) {
    const t = useTranslations("replay.timeline");
    const ended = t("gameEnded", { side: winner ?? "none" });

    return (
        <>
            <span className={styles.axis} style={{ top: AXIS }} />
            <span
                role="img"
                aria-label={t("gatesOpen")}
                title={t("gatesOpen")}
                className={classNames(styles.bookend, sideClass(null))}
                style={{ left: 0, top: AXIS }}
            >
                <DoorOpen className={styles.bookendIcon} aria-hidden />
            </span>
            <span
                role="img"
                aria-label={ended}
                title={ended}
                className={classNames(styles.bookend, sideClass(winner))}
                style={{ left: "100%", top: AXIS }}
            >
                <Trophy className={styles.bookendIcon} aria-hidden />
            </span>
        </>
    );
}
