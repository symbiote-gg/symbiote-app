import { Info } from "lucide-react";
import { useFormatter, useTranslations } from "use-intl";

import { HeroPortrait } from "@/components";
import { Tooltip, Typography } from "@/ui";
import { type Roster, playerOf } from "@/utils/timeline/roster";
import type { UnplacedKills } from "./kill-log";

import styles from "./styles.module.css";

interface UnplacedProps {
    unplaced: UnplacedKills;
    roster: Roster;
}

export function Unplaced({
    unplaced: { victims, count, times },
    roster,
}: UnplacedProps) {
    const t = useTranslations("replay.killLog");
    const format = useFormatter();

    const players = victims.map((slot) => playerOf(roster, slot));
    const names = players.map((player) => player?.heroName ?? "?");
    const hero = format.list(names, { type: "conjunction" });
    // with several victims, which ones the kills are on is unknown
    const many = victims.length > 1;

    return (
        <div className={styles.unplaced}>
            <span className={styles.victims}>
                {players.map((player, i) => (
                    <span key={victims[i]} className={styles.victim}>
                        <HeroPortrait
                            size="sm"
                            name={names[i]}
                            portrait={player?.heroPortrait ?? null}
                        />
                    </span>
                ))}
            </span>
            <div className={styles.unplacedText}>
                <Typography weight="semibold">
                    {many
                        ? t("unplacedMany", { count })
                        : t("unplaced", { count, hero })}
                </Typography>
                <span className={styles.unplacedHint}>
                    <Typography size="sm" variant="tertiary">
                        {many
                            ? t("unplacedManyHint", {
                                  total: times.length,
                                  hero,
                              })
                            : t("unplacedHint", { total: times.length })}
                    </Typography>
                    <Tooltip
                        content={t("unplacedWhy")}
                        description={t(
                            many ? "unplacedManyWhyHint" : "unplacedWhyHint",
                            { count, total: times.length, hero },
                        )}
                    >
                        <Info
                            className={styles.unplacedInfo}
                            aria-label={t("unplacedWhy")}
                        />
                    </Tooltip>
                </span>
            </div>
        </div>
    );
}
