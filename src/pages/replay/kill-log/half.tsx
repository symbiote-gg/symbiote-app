import classNames from "classnames";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { CardBody, CardHeader, TableHead } from "@/ui";
import type { Roster } from "@/utils/timeline/roster";
import type { OwnerDeath } from "./kill-log";
import { Row } from "./row";

import styles from "./styles.module.css";

export type Tone = "win" | "loss" | "muted";

interface HalfProps {
    title: ReactNode;
    icon: LucideIcon;
    top: ReactNode;
    heroLabel: string;
    withLabel: string;
    empty: ReactNode;
    entries: OwnerDeath[];
    roster: Roster;
    footer?: ReactNode;
}

export function Half({
    title,
    icon,
    top,
    heroLabel,
    withLabel,
    empty,
    entries,
    roster,
    footer,
}: HalfProps) {
    const t = useTranslations("replay.killLog");

    return (
        <div className={styles.half}>
            <CardHeader size="sm" icon={icon} title={title} action={top} />
            {entries.length === 0 && !footer ? (
                empty
            ) : entries.length === 0 ? (
                <CardBody className={styles.body}>{footer}</CardBody>
            ) : (
                <CardBody className={styles.body}>
                    <TableHead
                        strip
                        className={classNames(styles.columns, styles.head)}
                        columns={[
                            { key: "time", label: t("time") },
                            { key: "hero", label: heroLabel },
                            { key: "with", label: withLabel },
                            { key: "fight", label: t("fight") },
                        ]}
                    />
                    <ul>
                        {entries.map((entry) => (
                            <Row
                                key={`${entry.death.time}-${entry.death.victim}`}
                                entry={entry}
                                roster={roster}
                            />
                        ))}
                    </ul>
                    {footer}
                </CardBody>
            )}
        </div>
    );
}
