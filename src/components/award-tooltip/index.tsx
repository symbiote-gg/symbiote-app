import classNames from "classnames";
import type { ReactNode } from "react";

import type { Award } from "@/api/replays";
import { Tooltip, Typography } from "@/ui";
import { AwardIcon } from "../award-icon";

import styles from "./styles.module.css";

const ACRONYM = /^[A-Z0-9]{2,}$/;

function sentenceCase(award: Award, description: string) {
    if (award.type === "mvp") return description;

    return description
        .split(" ")
        .map((word, index) =>
            index === 0 || ACRONYM.test(word) ? word : word.toLowerCase(),
        )
        .join(" ");
}

export interface AwardTooltipProps {
    award: Award;
    chips?: ReactNode;
    className?: string;
    children: ReactNode;
}

export function AwardTooltip({
    award,
    chips,
    className,
    children,
}: AwardTooltipProps) {
    if (!award.description && !chips) return children;

    const name = award.name ?? award.type;
    const mvp = award.type === "mvp";

    const card = (
        <>
            <header className={styles.header}>
                <AwardIcon award={award} size="lg" />
                <div className={styles.text}>
                    <Typography
                        size="base"
                        weight="semibold"
                        truncate
                        className={styles.title}
                    >
                        {name}
                    </Typography>
                    {chips && <div className={styles.chips}>{chips}</div>}
                </div>
            </header>
            {award.description && (
                <Typography size="sm" variant="secondary">
                    {sentenceCase(award, award.description)}
                </Typography>
            )}
        </>
    );

    return (
        <Tooltip
            content={card}
            compact={false}
            className={className}
            panelClassName={classNames(styles.panel, {
                [styles.mvp]: mvp,
            })}
        >
            {children}
        </Tooltip>
    );
}
