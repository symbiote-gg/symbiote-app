import classNames from "classnames";

import type { Award } from "@/api/replays";
import { Chip } from "@/ui";
import { AWARD_VARIANTS } from "@/utils/image-variants";
import { GameIcon } from "../game-icon";

import styles from "./styles.module.css";

export interface AwardPillProps {
    award: Award;
    iconOnlyWhenNarrow?: boolean;
}

export function AwardPill({ award, iconOnlyWhenNarrow }: AwardPillProps) {
    const name = award.name ?? award.type;

    return (
        <Chip
            size="sm"
            tone={award.type === "mvp" ? "mvp" : "neutral"}
            leading={
                <GameIcon
                    category="matchawards"
                    icon={award.icon}
                    label={name}
                    variant={AWARD_VARIANTS.pill}
                    className={styles.icon}
                />
            }
            className={classNames(styles.root, {
                [styles.iconOnlyWhenNarrow]: iconOnlyWhenNarrow,
            })}
        >
            <span className={styles.label}>{name}</span>
        </Chip>
    );
}

export interface AwardPillsProps {
    awards: Award[];
    iconOnlyWhenNarrow?: boolean;
}

export function AwardPills({ awards, iconOnlyWhenNarrow }: AwardPillsProps) {
    return awards.map((award) => (
        <AwardPill
            key={award.type}
            award={award}
            iconOnlyWhenNarrow={iconOnlyWhenNarrow}
        />
    ));
}
