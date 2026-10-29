import classNames from "classnames";
import { useTranslations } from "use-intl";

import { HeroPortrait } from "@/components";
import { Roster } from "@/utils/timeline/roster";
import { playerOf } from "@/utils/timeline/roster";
import { DeathEntry } from "@/utils/timeline/types";
import { sideClasses } from "../../../../side";
import { KillCells } from "./kill-cells";

import styles from "./styles.module.css";

interface KillRowProps {
    death: DeathEntry;
    offset: number | null;
    roster: Roster;
}

export function KillRow({ death, offset, roster }: KillRowProps) {
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
