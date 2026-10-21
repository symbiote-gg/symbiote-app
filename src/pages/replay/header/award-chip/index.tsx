import classNames from "classnames";

import type { Award } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";

import styles from "./styles.module.css";

export interface AwardChipProps {
    award: Award;
}

export function AwardChip({ award }: AwardChipProps) {
    if (!award.description) return <Chip award={award} />;

    return (
        <Tooltip
            content={
                <>
                    <Typography size="xs" weight="semibold">
                        {award.name ?? award.type}
                    </Typography>
                    <Typography size="xs" variant="secondary">
                        {award.description}
                    </Typography>
                </>
            }
        >
            <Chip award={award} />
        </Tooltip>
    );
}

function Chip({ award }: { award: Award }) {
    return (
        <span
            className={classNames(styles.root, {
                [styles.mvp]: award.type === "mvp",
            })}
        >
            <Typography
                size="xs"
                weight="semibold"
                uppercase
                noWrap
                className={styles.label}
            >
                {award.name ?? award.type}
            </Typography>
        </span>
    );
}
