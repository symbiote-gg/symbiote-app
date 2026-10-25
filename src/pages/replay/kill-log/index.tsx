import classNames from "classnames";
import { ShieldCheck, Swords, Tombstone } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslations } from "use-intl";

import type {
    ReplayPlayerDetail,
    Timeline as TimelineData,
} from "@/api/replays";
import { Card } from "@/ui";
import { formatDuration } from "@/utils/dates";
import { ownerDeaths } from "@/utils/timeline/kill-log";
import type { Roster } from "@/utils/timeline/roster";
import { Empty } from "./empty";
import { Half, type Tone } from "./half";

import styles from "./styles.module.css";

interface KillLogProps {
    timeline: TimelineData;
    duration: number;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    owner: ReplayPlayerDetail;
}

export function KillLog({
    timeline,
    duration,
    players,
    allyTeam,
    owner,
}: KillLogProps) {
    const t = useTranslations("replay.killLog");

    const roster: Roster = { players, allyTeam, highlightSlot: owner.slot };

    const entries = useMemo(
        () => ownerDeaths(timeline, duration, allyTeam, owner.slot),
        [timeline, duration, allyTeam, owner.slot],
    );
    const kills = entries.filter((entry) => entry.role === "kill");
    const deaths = entries.filter((entry) => entry.role === "death");

    const killsTone: Tone = kills.length > 0 ? "win" : "muted";
    const deathsTone: Tone = deaths.length > 0 ? "loss" : "win";

    const toned = (tone: Tone) => (chunks: ReactNode) => (
        <span className={classNames(styles.number, styles[tone])}>
            {chunks}
        </span>
    );

    return (
        <Card className={styles.root}>
            <div className={styles.halves}>
                <Half
                    title={t.rich("title", {
                        count: kills.length,
                        n: toned(killsTone),
                    })}
                    icon={Swords}
                    heroLabel={t("victim")}
                    withLabel={t("with")}
                    empty={
                        <Empty
                            icon={Swords}
                            tone="muted"
                            title={t("noKills")}
                            description={t("noKillsHint")}
                        />
                    }
                    entries={kills}
                    roster={roster}
                />
                <Half
                    title={t.rich("deathsTitle", {
                        count: deaths.length,
                        n: toned(deathsTone),
                    })}
                    icon={Tombstone}
                    heroLabel={t("killedBy")}
                    withLabel={t("helpedBy")}
                    empty={
                        <Empty
                            icon={ShieldCheck}
                            tone="win"
                            title={t("deathless")}
                            description={t("deathlessHint", {
                                duration: formatDuration(Math.round(duration)),
                            })}
                        />
                    }
                    entries={deaths}
                    roster={roster}
                />
            </div>
        </Card>
    );
}
