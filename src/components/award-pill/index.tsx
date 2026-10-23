import classNames from "classnames";

import type { Award } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { GameIcon } from "../game-icon";

import styles from "./styles.module.css";

export interface AwardPillProps {
    award: Award;
    iconOnlyWhenNarrow?: boolean;
}

export function AwardPill({ award, iconOnlyWhenNarrow }: AwardPillProps) {
    const name = award.name ?? award.type;
    const pill = (
        <Pill
            award={award}
            name={name}
            iconOnlyWhenNarrow={iconOnlyWhenNarrow}
        />
    );

    if (!award.description) return pill;

    return (
        <Tooltip content={name} description={award.description}>
            {pill}
        </Tooltip>
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

interface PillProps extends AwardPillProps {
    name: string;
}

function Pill({ award, name, iconOnlyWhenNarrow }: PillProps) {
    return (
        <span
            className={classNames(styles.root, {
                [styles.mvp]: award.type === "mvp",
                [styles.iconOnlyWhenNarrow]: iconOnlyWhenNarrow,
            })}
        >
            <GameIcon
                category="matchawards"
                icon={award.icon}
                label={name}
                className={styles.icon}
            />
            <Typography
                size="xs"
                weight="semibold"
                noWrap
                className={styles.label}
            >
                {name}
            </Typography>
        </span>
    );
}
