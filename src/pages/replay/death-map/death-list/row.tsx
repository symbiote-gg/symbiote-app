import classNames from "classnames";
import type { MouseEvent } from "react";
import { useTranslations } from "use-intl";

import type { DeathKind } from "@/api/replays";
import { HeroPlayerName } from "@/components";
import type { TimelineText } from "@/hooks/useTimelineText";
import { Typography } from "@/ui";
import type { Roster } from "@/utils/timeline/roster";
import type { DeathEntry } from "@/utils/timeline/types";
import { KindChip } from "../../kill-log/kind-chip";
import { FallenPortrait } from "../../timeline/popover/variants/kills/fallen-portrait";
import { KillCells } from "../../timeline/popover/variants/kills/kill-cells";

import styles from "./styles.module.css";

interface RowProps {
    id: number;
    entry: DeathEntry;
    kind: DeathKind | undefined;
    selected: boolean;
    roster: Roster;
    text: TimelineText;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function Row({
    id,
    entry,
    kind,
    selected,
    roster,
    text,
    onClick,
}: RowProps) {
    const t = useTranslations("replay");

    return (
        <li className={styles.item}>
            <button
                type="button"
                data-death={id}
                aria-pressed={selected}
                aria-label={text.entryLabel(entry)}
                className={classNames(styles.columns, styles.row, {
                    [styles.selected]: selected,
                })}
                onClick={onClick}
            >
                <Typography as="span" mono weight="semibold">
                    {text.at(entry.time)}
                </Typography>
                <KillCells
                    killingBlow={entry.killingBlow}
                    credited={entry.killers}
                    noKiller={t("timeline.aiCredit")}
                    roster={roster}
                />
                <span className={styles.victim}>
                    <FallenPortrait slot={entry.victim} roster={roster} />
                    <HeroPlayerName slot={entry.victim} roster={roster} />
                </span>
                {kind ? <KindChip kind={kind} size="sm" /> : <span />}
            </button>
        </li>
    );
}
