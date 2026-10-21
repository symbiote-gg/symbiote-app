import classNames from "classnames";

import type { Award } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { GameIcon } from "../game-icon";

import styles from "./styles.module.css";

export interface AwardPillProps {
    award: Award;
}

export function AwardPill({ award }: AwardPillProps) {
    const name = award.name ?? award.type;

    if (!award.description) return <Pill award={award} />;

    return (
        <Tooltip
            content={
                <>
                    <Typography size="xs" weight="semibold">
                        {name}
                    </Typography>
                    <Typography size="xs" variant="secondary">
                        {award.description}
                    </Typography>
                </>
            }
        >
            <Pill award={award} />
        </Tooltip>
    );
}

function Pill({ award }: AwardPillProps) {
    const name = award.name ?? award.type;
    return (
        <span
            className={classNames(styles.root, {
                [styles.mvp]: award.type === "mvp",
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
