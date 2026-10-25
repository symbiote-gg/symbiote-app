import { useParams } from "wouter";

import type { ReplayDetail as ReplayDetailData } from "@/api/replays";
import { BackToReplays, Page } from "@/components";
import { useReplay } from "@/hooks/useReplay";
import { ErrorMessage } from "@/ui";
import { Header } from "./header";
import { KillLog } from "./kill-log";
import { Scoreboard, ScoreboardTeam } from "./scoreboard";
import { Timeline } from "./timeline";

import styles from "./styles.module.css";

const scoreboardTeam = (
    replay: ReplayDetailData,
    team: number,
): ScoreboardTeam => ({
    ally: team === replay.ownerTeam,
    summary: replay.teams[team],
    players: replay.players
        .filter((p) => p.team === team)
        .sort(
            (a, b) =>
                Number(b.slot === replay.ownerSlot) -
                Number(a.slot === replay.ownerSlot),
        ),
});

export function ReplayDetail() {
    const { replayId } = useParams<{ replayId: string }>();
    const { data: replay, error } = useReplay(Number(replayId));

    const owner = replay?.players.find((p) => p.slot === replay.ownerSlot);
    const allyTeam = replay?.ownerTeam ?? 0;

    return (
        <Page>
            <div className={styles.main}>
                {error && (
                    <>
                        <BackToReplays />
                        <ErrorMessage error={error} />
                    </>
                )}
                {replay && (
                    <>
                        <Header
                            replay={replay}
                            owner={owner}
                            allyTeam={allyTeam}
                        />
                        <Scoreboard
                            ownerId={replay.ownerPlayerId}
                            teams={[
                                scoreboardTeam(replay, allyTeam),
                                scoreboardTeam(replay, 1 - allyTeam),
                            ]}
                            duration={replay.duration}
                        />
                        {!replay.eventsExpired && (
                            <>
                                <Timeline
                                    timeline={replay.timeline}
                                    duration={replay.duration}
                                    players={replay.players}
                                    allyTeam={allyTeam}
                                    ownerSlot={replay.ownerSlot}
                                    ownerWin={replay.ownerWin}
                                />
                                {owner && (
                                    <KillLog
                                        timeline={replay.timeline}
                                        killLog={replay.killLog}
                                        duration={replay.duration}
                                        players={replay.players}
                                        allyTeam={allyTeam}
                                        owner={owner}
                                    />
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </Page>
    );
}
