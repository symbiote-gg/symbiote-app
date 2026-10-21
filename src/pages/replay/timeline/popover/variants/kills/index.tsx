import classNames from "classnames";
import { CpuAi, Sword } from "lucide-react";
import { useTranslations } from "use-intl";

import { HeroPortrait } from "@/components";
import { Tooltip } from "@/ui";
import { type Roster, heroName, playerOf } from "@/utils/timeline/roster";
import type { DeathEntry, StructureEntry } from "@/utils/timeline/types";
import { GlyphIcon } from "../../../glyphs";
import { sideClasses } from "../../../side";
import { TeamPortrait } from "../../parts/team-portrait";

import styles from "./styles.module.css";

interface KillCellsProps {
    killingBlow: number | null;
    credited: number[];
    noKiller: string;
    roster: Roster;
}

/** Killer, assists and sword, shared by hero and structure kill rows. */
function KillCells({
    killingBlow,
    credited,
    noKiller,
    roster,
}: KillCellsProps) {
    const t = useTranslations("replay.timeline");

    const assists = credited.filter((slot) => slot !== killingBlow);

    return (
        <>
            <span className={styles.killer}>
                {killingBlow !== null ? (
                    <TeamPortrait
                        slot={killingBlow}
                        size="sm"
                        roster={roster}
                    />
                ) : (
                    <Tooltip content={noKiller}>
                        <span className={styles.noKiller} aria-label={noKiller}>
                            <CpuAi className={styles.tileIcon} aria-hidden />
                        </span>
                    </Tooltip>
                )}
                {assists.length > 0 && (
                    <Tooltip
                        content={t("assists", {
                            heroes: assists
                                .map((slot) => heroName(roster, slot))
                                .join(", "),
                        })}
                    >
                        <span className={styles.assists}>
                            {assists.map((slot) => (
                                <TeamPortrait
                                    key={slot}
                                    slot={slot}
                                    size="xs"
                                    roster={roster}
                                    thin
                                />
                            ))}
                        </span>
                    </Tooltip>
                )}
            </span>
            <Sword className={styles.sword} aria-hidden />
        </>
    );
}

interface KillRowProps {
    death: DeathEntry;
    offset: number | null;
    roster: Roster;
}

function KillRow({ death, offset, roster }: KillRowProps) {
    const t = useTranslations("replay.timeline");

    const victim = playerOf(roster, death.victim);

    return (
        <div className={classNames(styles.row, sideClasses(death.side))}>
            {offset !== null && (
                <span className={styles.offset}>
                    {t("offset", { seconds: Math.round(offset) })}
                </span>
            )}
            <KillCells
                killingBlow={death.killingBlow}
                credited={death.killers}
                noKiller={t("noKillingBlow")}
                roster={roster}
            />
            <span className={styles.victim}>
                <HeroPortrait
                    size="sm"
                    name={victim?.heroName ?? "?"}
                    portrait={victim?.heroPortrait ?? null}
                    className={classNames(styles.fallen, {
                        [styles.mine]: death.victim === roster.highlightSlot,
                    })}
                />
            </span>
        </div>
    );
}

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
                    noKiller={t("noHeroCredit")}
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
