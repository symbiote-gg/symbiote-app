import classNames from "classnames";

import type { Award } from "@/api/replays";
import { AWARD_VARIANTS } from "@/utils/image-variants";
import { GameIcon } from "../game-icon";

import styles from "./styles.module.css";

export type AwardIconSize = "md" | "lg";

export interface AwardIconProps {
    award: Award;
    size: AwardIconSize;
    className?: string;
}

export function AwardIcon({ award, size, className }: AwardIconProps) {
    const name = award.name ?? award.type;

    if (award.type !== "mvp") {
        return (
            <GameIcon
                category="matchawards"
                icon={award.icon}
                label={name}
                variant={AWARD_VARIANTS[size].badge}
                framed
                className={classNames(className, styles[size], styles.badge)}
            />
        );
    }

    return (
        <span className={classNames(className, styles[size], styles.frame)}>
            <GameIcon
                category="matchawards"
                icon={award.icon}
                label={name}
                variant={AWARD_VARIANTS[size].mvp}
                className={styles.spin}
            />
        </span>
    );
}
