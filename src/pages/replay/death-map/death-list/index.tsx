import { type MouseEvent, useEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import type { DeathKind } from "@/api/replays";
import type { TimelineText } from "@/hooks/useTimelineText";
import { CardBody, TableHead, Typography } from "@/ui";
import type { Roster } from "@/utils/timeline/roster";
import type { PlacedDeath } from "../deaths";
import { Row } from "./row";

import styles from "./styles.module.css";

const COLUMNS = ["time", "killers", "sword", "victim", "fight"] as const;

function reveal(rows: HTMLElement, id: number) {
    const row = rows.querySelector(`[data-death="${id}"]`);
    if (!row) return;

    const view = rows.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const by =
        box.top < view.top
            ? box.top - view.top
            : box.bottom > view.bottom
              ? box.bottom - view.bottom
              : 0;

    if (by !== 0) rows.scrollBy({ top: by, behavior: "smooth" });
}

interface DeathListProps {
    deaths: PlacedDeath[];
    kinds: Map<number, DeathKind>;
    selectedId: number | null;
    roster: Roster;
    text: TimelineText;
    onSelect: (id: number) => void;
}

export function DeathList({
    deaths,
    kinds,
    selectedId,
    roster,
    text,
    onSelect,
}: DeathListProps) {
    const t = useTranslations("replay.deathMap.feed");
    const rowsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedId === null || !rowsRef.current) return;

        reveal(rowsRef.current, selectedId);
    }, [selectedId]);

    const onClick = (e: MouseEvent<HTMLButtonElement>) =>
        onSelect(Number(e.currentTarget.dataset.death));

    return (
        <div className={styles.root}>
            <TableHead
                strip
                className={styles.columns}
                columns={COLUMNS.map((key) => ({
                    key,
                    label: key === "sword" ? "" : t(`columns.${key}`),
                }))}
            />
            <CardBody ref={rowsRef}>
                {deaths.length === 0 ? (
                    <Typography
                        size="sm"
                        variant="tertiary"
                        className={styles.empty}
                    >
                        {t("empty")}
                    </Typography>
                ) : (
                    <ul>
                        {deaths.map(({ id, entry }) => (
                            <Row
                                key={id}
                                id={id}
                                entry={entry}
                                kind={kinds.get(id)}
                                selected={id === selectedId}
                                roster={roster}
                                text={text}
                                onClick={onClick}
                            />
                        ))}
                    </ul>
                )}
            </CardBody>
        </div>
    );
}
