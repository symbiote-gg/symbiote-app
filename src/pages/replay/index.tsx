import { useRef, useState } from "react";
import { useParams } from "wouter";

import type {
    ReplayDetail as ReplayDetailData,
    StandoutId,
} from "@/api/replays";
import { BackToReplays, Page } from "@/components";
import { useReplay } from "@/hooks/useReplay";
import { useStandouts } from "@/hooks/useStandouts";
import { ErrorMessage } from "@/ui";
import { Header } from "./header";
import { KillLog } from "./kill-log";
import { RolePerformances } from "./role-performances";
import { Scoreboard, ScoreboardTeam } from "./scoreboard";
import { Standouts } from "./standouts";
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
    const [shownStandout, setShownStandout] = useState<StandoutId | null>(null);
    const timelineRef = useRef<HTMLElement>(null);

    const standouts = useStandouts(
        Number(replayId),
        !!replay && !replay.eventsExpired,
    );
    const items = standouts.data?.items ?? [];
    const result = standouts.data ?? null;

    const owner = replay?.players.find((p) => p.slot === replay.ownerSlot);
    const allyTeam = replay?.ownerTeam ?? 0;
    const shown = items.find((item) => item.id === shownStandout) ?? null;

    const onShowStandout = (id: StandoutId) => {
        const next = shownStandout === id ? null : id;
        setShownStandout(next);
        if (next !== null) {
            timelineRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    };

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
                                {result && (
                                    <Standouts
                                        result={result}
                                        shown={shownStandout}
                                        onShow={onShowStandout}
                                    />
                                )}
                                <Timeline
                                    ref={timelineRef}
                                    highlight={shown?.highlight ?? null}
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
                        <RolePerformances
                            players={replay.players}
                            allyTeam={allyTeam}
                            ownerId={replay.ownerPlayerId}
                            ownerRole={replay.heroRole}
                        />
                    </>
                )}
            </div>
        </Page>
    );
}
