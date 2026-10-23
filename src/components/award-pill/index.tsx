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

    if (!award.description) return <Pill award={award} name={name} />;

    return (
        <Tooltip content={name} description={award.description}>
            <Pill award={award} name={name} />
        </Tooltip>
    );
}

export interface AwardPillsProps {
    awards: Award[];
}

export function AwardPills({ awards }: AwardPillsProps) {
    return awards.map((award) => <AwardPill key={award.type} award={award} />);
}

interface PillProps extends AwardPillProps {
    name: string;
}

function Pill({ award, name }: PillProps) {
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
