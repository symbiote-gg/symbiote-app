import classNames from "classnames";

import type { RoleScore } from "@/api/replays";
import { Typography } from "@/ui";
import { sideClasses } from "../../side";
import { formatScore } from "../role-performances";

import styles from "./styles.module.css";

interface ScoreBarProps {
    score: RoleScore;
    className?: string;
}

export function ScoreBar({ score, className }: ScoreBarProps) {
    const { ally, enemy, verdict } = score;
    const total = (ally ?? 0) + (enemy ?? 0);
    const allyShare = total === 0 ? 0.5 : (ally ?? 0) / total;

    return (
        <span className={classNames(styles.root, className)}>
            <Typography
                as="span"
                size="xl2"
                weight="semibold"
                mono
                noWrap
                className={classNames(styles.value, sideClasses("ally"))}
            >
                {formatScore(ally)}
            </Typography>
            <span className={styles.track}>
                {ally !== null && enemy !== null && (
                    <>
                        <span
                            className={classNames(
                                styles.segment,
                                sideClasses("ally"),
                                { [styles.trailing]: verdict === "enemy" },
                            )}
                            style={{ width: `${allyShare * 100}%` }}
                        />
                        <span
                            className={classNames(
                                styles.segment,
                                sideClasses("enemy"),
                                { [styles.trailing]: verdict === "ally" },
                            )}
                        />
                    </>
                )}
            </span>
            <Typography
                as="span"
                size="xl2"
                weight="semibold"
                mono
                noWrap
                className={classNames(styles.value, sideClasses("enemy"))}
            >
                {formatScore(enemy)}
            </Typography>
        </span>
    );
}
