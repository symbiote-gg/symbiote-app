import { ChevronLeft } from "lucide-react";
import { useTranslations } from "use-intl";
import { useParams } from "wouter";

import { Page } from "@/components";
import { useReplay } from "@/hooks/useReplay";
import { ButtonLink } from "@/ui";
import { Header } from "./header";
import { Scoreboard, ScoreboardTeam } from "./scoreboard";
import { Timeline } from "./timeline";

import styles from "./styles.module.css";

export function ReplayDetail() {
    const { replayId } = useParams<{ replayId: string }>();
    const t = useTranslations();
    const { data: replay, error } = useReplay(Number(replayId));

    const owner = replay?.players.find(
        (p) => p.playerId === replay.ownerPlayerId,
    );
    const allyTeam = owner?.team ?? 0;

    const teamLevel = (team: number) => {
        if (!replay) return null;

        const levels = replay.xp
            .filter((sample) => sample.team === team)
            .map((sample) => sample.level);

        return levels.length > 0 ? Math.max(...levels) : null;
    };

    const teams: ScoreboardTeam[] = [allyTeam, 1 - allyTeam].map((team) => ({
        ally: team === allyTeam,
        level: teamLevel(team),
        players: replay
            ? replay.players
                  .filter((p) => p.team === team)
                  .sort(
                      (a, b) =>
                          Number(b.playerId === replay.ownerPlayerId) -
                          Number(a.playerId === replay.ownerPlayerId),
                  )
            : [],
    }));

    return (
        <Page>
            <div className={styles.main}>
                {error && (
                    <>
                        <ButtonLink
                            href="/replays"
                            variant="secondary"
                            size="sm"
                            arrow={false}
                        >
                            <ChevronLeft />
                            {t("replay.replays")}
                        </ButtonLink>
                        <p className={styles.error}>{String(error)}</p>
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
                            teams={teams}
                            duration={replay.duration}
                        />
                        <Timeline
                            timeline={replay.timeline}
                            duration={replay.duration}
                            players={replay.players}
                            allyTeam={allyTeam}
                            ownerSlot={owner?.slot ?? null}
                            ownerWin={replay.ownerWin}
                        />
                    </>
                )}
            </div>
        </Page>
    );
}
