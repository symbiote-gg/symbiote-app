import classNames from "classnames";
import { type MouseEvent, useEffect, useRef } from "react";
import { useTranslations } from "use-intl";

import { TeamPortrait } from "@/components/team-portrait";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Eyebrow, Typography } from "@/ui";
import { type Roster, heroName, playerOf } from "@/utils/timeline/roster";
import type { PlacedDeath } from "../deaths";

import styles from "./styles.module.css";

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
    time: number;
    selectedId: number | null;
    roster: Roster;
    text: TimelineText;
    onSelect: (id: number) => void;
}

export function DeathList({
    deaths,
    time,
    selectedId,
    roster,
    text,
    onSelect,
}: DeathListProps) {
    const t = useTranslations("replay.deathMap");
    const rowsRef = useRef<HTMLUListElement>(null);

    const past = deaths.filter(({ entry }) => entry.time <= time);
    const currentId = past.length > 0 ? past[past.length - 1].id : null;
    const shownCurrentId = useRef(currentId);

    useEffect(() => {
        if (selectedId === null || !rowsRef.current) return;

        reveal(rowsRef.current, selectedId);
    }, [selectedId]);

    useEffect(() => {
        if (currentId === shownCurrentId.current) return;

        shownCurrentId.current = currentId;
        if (currentId === null || !rowsRef.current) return;

        reveal(rowsRef.current, currentId);
    }, [currentId]);

    const onClick = (e: MouseEvent<HTMLButtonElement>) =>
        onSelect(Number(e.currentTarget.dataset.death));

    return (
        <div className={styles.root}>
            <div className={styles.listHead}>
                <Eyebrow>{t("killFeed")}</Eyebrow>
                <Typography size="xs" variant="tertiary" mono>
                    {deaths.length}
                </Typography>
            </div>
            <ul ref={rowsRef} className={styles.rows}>
                {deaths.map(({ id, entry }) => (
                    <li key={id}>
                        <button
                            type="button"
                            data-death={id}
                            aria-pressed={id === selectedId}
                            aria-label={text.entryLabel(entry)}
                            className={classNames(styles.row, {
                                [styles.mine]:
                                    entry.victim === roster.highlightSlot,
                                [styles.selected]: id === selectedId,
                                [styles.later]: entry.time > time,
                            })}
                            onClick={onClick}
                        >
                            <span className={styles.rowTime}>
                                {text.at(entry.time)}
                            </span>
                            <TeamPortrait
                                slot={entry.victim}
                                size="sm"
                                roster={roster}
                            />
                            <span className={styles.rowText}>
                                <Typography weight="semibold" truncate>
                                    {heroName(roster, entry.victim)}
                                </Typography>
                                <Typography
                                    size="sm"
                                    variant="tertiary"
                                    truncate
                                >
                                    {playerOf(roster, entry.victim)?.name}
                                </Typography>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
