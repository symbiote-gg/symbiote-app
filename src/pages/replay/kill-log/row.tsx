import classNames from "classnames";
import { useTranslations } from "use-intl";

import {
    AiPortrait,
    AssistPortraits,
    HeroPlayerName,
    HeroPortrait,
    TeamPortrait,
} from "@/components";
import { Typography } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { killerOf } from "@/utils/timeline/markers";
import { type Roster, playerOf } from "@/utils/timeline/roster";
import type { OwnerDeath } from "./kill-log";
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
                {formatDuration(death.time)}
            </Typography>
            <div className={styles.hero}>
                {role !== "death" ? (
                    <span className={styles.victim}>
                        <HeroPortrait
                            size="sm"
                            name={victim?.heroName ?? "?"}
                            portrait={victim?.heroPortrait ?? null}
                        />
                    </span>
                ) : hero === null ? (
                    <AiPortrait />
                ) : (
                    <TeamPortrait slot={hero} size="sm" roster={roster} />
                )}
                {hero === null ? (
                    <Typography weight="semibold" truncate>
                        {t("timeline.aiCredit")}
                    </Typography>
                ) : (
                    <HeroPlayerName slot={hero} roster={roster} />
                )}
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
