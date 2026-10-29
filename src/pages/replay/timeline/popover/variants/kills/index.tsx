import classNames from "classnames";
import { useTranslations } from "use-intl";

import { type Roster } from "@/utils/timeline/roster";
import type { DeathEntry, StructureEntry } from "@/utils/timeline/types";
import { sideClasses } from "../../../../side";
import { GlyphIcon } from "../../../glyphs";
import { KillCells } from "./kill-cells";
import { KillRow } from "./kill-row";

import styles from "./styles.module.css";

interface KillsProps {
    deaths: DeathEntry[];
    offsets: boolean;
    time: number;
    roster: Roster;
}

export function Kills({ deaths, offsets, time, roster }: KillsProps) {
    return (
        <div
            className={classNames(styles.kills, { [styles.offsets]: offsets })}
        >
            {[...deaths]
                .sort((a, b) => a.time - b.time)
                .map((death, index) => (
                    <KillRow
                        key={index}
                        death={death}
                        offset={offsets ? death.time - time : null}
                        roster={roster}
                    />
                ))}
        </div>
    );
}

interface StructureKillProps {
    entry: StructureEntry;
    roster: Roster;
}

export function StructureKill({ entry, roster }: StructureKillProps) {
    const t = useTranslations("replay.timeline");

    return (
        <div className={styles.kills}>
            <div className={classNames(styles.row, sideClasses(entry.side))}>
                <KillCells
                    killingBlow={entry.killingBlow}
                    credited={entry.killers}
                    noKiller={t("aiCredit")}
                    roster={roster}
                />
                <span className={styles.structure}>
                    <GlyphIcon
                        glyph={entry.keep ? "keep" : "castle"}
                        className={classNames(styles.tileIcon, styles.fallen)}
                    />
                </span>
            </div>
        </div>
    );
}
