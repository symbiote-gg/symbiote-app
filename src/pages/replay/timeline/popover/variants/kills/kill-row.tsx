import classNames from "classnames";
import { useTranslations } from "use-intl";

import { sideClasses } from "@/ui";
import { Roster } from "@/utils/timeline/roster";
import { DeathEntry } from "@/utils/timeline/types";
import { FallenPortrait } from "./fallen-portrait";
import { KillCells } from "./kill-cells";

import styles from "./styles.module.css";

interface KillRowProps {
    death: DeathEntry;
    offset: number | null;
    roster: Roster;
}

export function KillRow({ death, offset, roster }: KillRowProps) {
    const t = useTranslations("replay.timeline");

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
                noKiller={t("aiCredit")}
                roster={roster}
            />
            <FallenPortrait slot={death.victim} roster={roster} />
        </div>
    );
}
