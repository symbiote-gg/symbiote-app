import { type LucideIcon, PanelsTopLeft, Scale, Swords } from "lucide-react";
import { Activity } from "react";
import { useTranslations } from "use-intl";
import { useParams } from "wouter";

import type { ReplayDetail as ReplayDetailData } from "@/api/replays";
import { BackToReplays, Page } from "@/components";
import { useReplay } from "@/hooks/useReplay";
import { useStandouts } from "@/hooks/useStandouts";
import { ErrorMessage, type TabItem, Tabs } from "@/ui";
import { DeathMap } from "./death-map";
import { Header } from "./header";
import { KillLog } from "./kill-log";
import { RolePerformances } from "./role-performances";
import { Scoreboard, ScoreboardTeam } from "./scoreboard";
import { Standouts } from "./standouts";
import { Timeline } from "./timeline";

import styles from "./styles.module.css";

const TABS = ["overview", "fights", "matchups"] as const;

type ReplayTab = (typeof TABS)[number];

const ICONS: Record<ReplayTab, LucideIcon> = {
    overview: PanelsTopLeft,
    fights: Swords,
    matchups: Scale,
};

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
    const t = useTranslations("replay.tabs");
    const { replayId, tab: tabParam } = useParams<{
        replayId: string;
        tab?: string;
    }>();
    const { data: replay, error } = useReplay(Number(replayId));

    const standouts = useStandouts(
        Number(replayId),
        !!replay && !replay.eventsExpired,
    );
    const result = standouts.data ?? null;

    // Standouts sit above the scoreboard, so the overview waits for them
    // instead of pushing the scoreboard down when they land.
    const standoutsPending = !replay?.eventsExpired && standouts.isPending;

    const owner = replay?.players.find((p) => p.slot === replay.ownerSlot);
    const allyTeam = replay?.ownerTeam ?? 0;

    const available = TABS.filter(
        (value) => value !== "fights" || !replay?.eventsExpired,
    );
    const tab = available.find((value) => value === tabParam) ?? "overview";

    const tabHref = (value: ReplayTab) =>
        value === "overview"
            ? `/replays/${replayId}`
            : `/replays/${replayId}/${value}`;

    const mode = (value: ReplayTab) => (value === tab ? "visible" : "hidden");

    const tabItems: TabItem<ReplayTab>[] = available.map((value) => ({
        value,
        label: t(value),
        href: tabHref(value),
        icon: ICONS[value],
    }));

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
                            tabs={
                                <Tabs
                                    label={t("label")}
                                    items={tabItems}
                                    value={tab}
                                />
                            }
                        />
                        {!standoutsPending && (
                            <Activity mode={mode("overview")}>
                                {result && <Standouts result={result} />}
                                <Scoreboard
                                    ownerId={replay.ownerPlayerId}
                                    teams={[
                                        scoreboardTeam(replay, allyTeam),
                                        scoreboardTeam(replay, 1 - allyTeam),
                                    ]}
                                    duration={replay.duration}
                                />
                            </Activity>
                        )}
                        {available.includes("fights") && (
                            <Activity mode={mode("fights")}>
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
                            </Activity>
                        )}
                        <Activity mode={mode("matchups")}>
                            <RolePerformances
                                performances={replay.rolePerformances}
                                players={replay.players}
                                ownerId={replay.ownerPlayerId}
                                ownerRole={replay.heroRole}
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
                        </Activity>
                    </>
                )}
            </div>
        </Page>
    );
}
