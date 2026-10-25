import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "use-intl";

import { CardBody, CardHeader, TableHead } from "@/ui";
import type { OwnerDeath } from "@/utils/timeline/kill-log";
import type { Roster } from "@/utils/timeline/roster";
import { Row } from "./row";

import styles from "./styles.module.css";

export type Tone = "win" | "loss" | "muted";

interface HalfProps {
    title: ReactNode;
    icon: LucideIcon;
    heroLabel: string;
    withLabel: string;
    empty: ReactNode;
    entries: OwnerDeath[];
    roster: Roster;
}

export function Half({
    title,
    icon,
    heroLabel,
    withLabel,
    empty,
    entries,
    roster,
}: HalfProps) {
    const t = useTranslations("replay.killLog");

    return (
        <div className={styles.half}>
            <CardHeader size="sm" icon={icon} title={title} />
            {entries.length === 0 ? (
                empty
            ) : (
                <>
                    <TableHead
                        strip
                        className={styles.columns}
                        columns={[
                            { key: "time", label: t("time") },
                            { key: "hero", label: heroLabel },
                            { key: "with", label: withLabel },
                            { key: "type", label: t("type") },
                        ]}
                    />
                    <CardBody className={styles.body}>
                        <ul>
                            {entries.map((entry) => (
                                <Row
                                    key={`${entry.death.time}-${entry.death.victim}`}
                                    entry={entry}
                                    roster={roster}
                                />
                            ))}
                        </ul>
                    </CardBody>
                </>
            )}
        </div>
    );
}
