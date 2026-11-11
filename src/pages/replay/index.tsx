import { useTranslations } from "use-intl";
import { useParams } from "wouter";

import type { ReplayDetail as ReplayDetailData } from "@/api/replays";
import { BackLink, Page } from "@/components";
import { useReplay } from "@/hooks/useReplay";
import { useStandouts } from "@/hooks/useStandouts";
import { ErrorMessage } from "@/ui";
import { DeathMap } from "./death-map";
import { Header } from "./header";
import { HeaderSkeleton } from "./header/skeleton";
import { KillLog } from "./kill-log";
import { RolePerformances } from "./role-performances";
import { Scoreboard, ScoreboardTeam } from "./scoreboard";
import { ScoreboardSkeleton } from "./scoreboard/skeleton";
import { Standouts } from "./standouts";
import { Timeline } from "./timeline";
import { XpSources } from "./xp-sources";

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
    const t = useTranslations("replay");
    const { replayId } = useParams<{ replayId: string }>();
    const { data: replay, error } = useReplay(Number(replayId));

    const standouts = useStandouts(Number(replayId));
    const result = standouts.data ?? null;

    const loading = !replay && !error;

    // Standouts sit above the scoreboard, so the overview waits for them
    // instead of pushing the scoreboard down when they land.
    const standoutsPending = !replay?.eventsExpired && standouts.isPending;

    const owner = replay?.players.find((p) => p.slot === replay.ownerSlot);
    const allyTeam = replay?.ownerTeam ?? 0;

    return (
        <Page>
            <div className={styles.main}>
                {error && (
                    <>
                        <BackLink href="/replays" label={t("replays")} />
                        <ErrorMessage error={error} />
                    </>
                )}
                {loading && (
                    <>
                        <HeaderSkeleton />
                        <ScoreboardSkeleton />
                    </>
                )}
                {!loading && replay && (
                    <>
                        <Header
                            replay={replay}
                            owner={owner}
                            allyTeam={allyTeam}
                        />
                        {standoutsPending && <ScoreboardSkeleton />}
                        {!standoutsPending && (
                            <>
                                {result && <Standouts result={result} />}
                                <Scoreboard
                                    ownerId={replay.ownerPlayerId}
                                    teams={[
                                        scoreboardTeam(replay, allyTeam),
                                        scoreboardTeam(replay, 1 - allyTeam),
                                    ]}
                                    duration={replay.duration}
                                />
                                {!replay.eventsExpired && owner && (
                                    <KillLog
                                        timeline={replay.timeline}
                                        killLog={replay.killLog}
                                        duration={replay.duration}
                                        players={replay.players}
                                        allyTeam={allyTeam}
                                        owner={owner}
                                    />
                                )}
                                <XpSources
                                    ally={replay.teams[allyTeam]}
                                    enemy={replay.teams[1 - allyTeam]}
                                />
                            </>
                        )}
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
                                <DeathMap
                                    key={replay.id}
                                    map={replay.map}
                                    timeline={replay.timeline}
                                    duration={replay.duration}
                                    players={replay.players}
                                    allyTeam={allyTeam}
                                    ownerSlot={replay.ownerSlot}
                                />
                            </>
                        )}
                        <RolePerformances
                            performances={replay.rolePerformances}
                            players={replay.players}
                            ownerId={replay.ownerPlayerId}
                            ownerRole={replay.heroRole}
                        />
                    </>
                )}
            </div>
        </Page>
    );
}
