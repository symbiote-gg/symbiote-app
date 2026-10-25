import classNames from "classnames";
import { CpuAi } from "lucide-react";
import { useTranslations } from "use-intl";

import { AssistPortraits, HeroPortrait, TeamPortrait } from "@/components";
import { Typography } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { type Roster, heroName, playerOf } from "@/utils/timeline/roster";
import { type OwnerDeath, killerOf } from "./kill-log";
import { KindChip } from "./kind-chip";

import styles from "./styles.module.css";

interface RowProps {
    entry: OwnerDeath;
    roster: Roster;
}

export function Row({ entry: { death, kind, role }, roster }: RowProps) {
    const t = useTranslations("replay");

    const hero = role === "death" ? killerOf(death) : death.victim;
    const others = death.killers.filter(
        (slot) => slot !== hero && slot !== roster.highlightSlot,
    );
    const victim = playerOf(roster, death.victim);

    return (
        <li className={classNames(styles.columns, styles.row)}>
            <Typography mono weight="semibold">
                {formatDuration(Math.round(death.time))}
            </Typography>
            <div className={styles.hero}>
                {role !== "death" ? (
                    // The ring sits on a wrapper: on the filtered element
                    // itself, WebKit clips the ring's box-shadow.
                    <span className={styles.victim}>
                        <HeroPortrait
                            size="sm"
                            name={victim?.heroName ?? "?"}
                            portrait={victim?.heroPortrait ?? null}
                        />
                    </span>
                ) : hero === null ? (
                    <span className={styles.ai}>
                        <CpuAi className={styles.aiIcon} aria-hidden />
                    </span>
                ) : (
                    <TeamPortrait slot={hero} size="sm" roster={roster} />
                )}
                <Typography weight="semibold" truncate>
                    {hero === null
                        ? t("timeline.aiCredit")
                        : heroName(roster, hero)}
                </Typography>
            </div>
            {others.length > 0 ? (
                <AssistPortraits slots={others} roster={roster} />
            ) : (
                <Typography variant="tertiary">-</Typography>
            )}
            <KindChip kind={kind} />
        </li>
    );
}
