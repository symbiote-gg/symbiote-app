import classNames from "classnames";
import { HeartPulse, Swords, Tombstone } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslations } from "use-intl";

import type {
    KillLog as KillLogData,
    ReplayPlayerDetail,
    Timeline as TimelineData,
} from "@/api/replays";
import { Card } from "@/ui";
import { formatDuration } from "@/utils/dates";
import type { Roster } from "@/utils/timeline/roster";
import { Empty } from "./empty";
import { Half, type Tone } from "./half";
import { killerOf, mostFrequent, ownerDeaths } from "./kill-log";
import { Top } from "./top";
import { Unplaced } from "./unplaced";

import styles from "./styles.module.css";

interface KillLogProps {
    timeline: TimelineData;
    killLog: KillLogData;
    duration: number;
    players: ReplayPlayerDetail[];
    allyTeam: number;
    owner: ReplayPlayerDetail;
}

export function KillLog({
    timeline,
    killLog,
    duration,
    players,
    allyTeam,
    owner,
}: KillLogProps) {
    const t = useTranslations("replay.killLog");

    const roster: Roster = { players, allyTeam, highlightSlot: owner.slot };

    const entries = useMemo(
        () => ownerDeaths(timeline, killLog, allyTeam),
        [timeline, killLog, allyTeam],
    );
    const { unplaced } = killLog;
    const kills = entries.filter((entry) => entry.role === "kill");
    const deaths = entries.filter((entry) => entry.role === "death");
    // with the kills no death places, the scoreboard's count
    const killCount = kills.length + (unplaced?.count ?? 0);

    // only when they're all on one hero
    const unplacedVictims =
        unplaced?.victims.length === 1
            ? Array<number>(unplaced.count).fill(unplaced.victims[0])
            : [];
    const mostKilled = mostFrequent([
        ...kills.map((entry) => entry.death.victim),
        ...unplacedVictims,
    ]);
    const mostBy = mostFrequent(deaths.map((entry) => killerOf(entry.death)));

    const killsTone: Tone = killCount > 0 ? "win" : "muted";
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
                        count: killCount,
                        n: toned(killsTone),
                    })}
                    icon={Swords}
                    top={
                        <Top
                            label={t("mostKilled")}
                            tone="win"
                            top={mostKilled}
                            roster={roster}
                        />
                    }
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
                    footer={
                        unplaced && (
                            <Unplaced unplaced={unplaced} roster={roster} />
                        )
                    }
                />
                <Half
                    title={t.rich("deathsTitle", {
                        count: deaths.length,
                        n: toned(deathsTone),
                    })}
                    icon={Tombstone}
                    top={
                        <Top
                            label={t("mostBy")}
                            tone="loss"
                            top={mostBy}
                            roster={roster}
                        />
                    }
                    heroLabel={t("killedBy")}
                    withLabel={t("helpedBy")}
                    empty={
                        <Empty
                            icon={HeartPulse}
                            tone="win"
                            title={t("immortal")}
                            description={t("immortalHint", {
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
