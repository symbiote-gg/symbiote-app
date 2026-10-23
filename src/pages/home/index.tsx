import { Page } from "@/components";
import { useMostPlayedHeroes } from "@/hooks/useMostPlayedHeroes";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import { useReplays } from "@/hooks/useReplays";
import { ErrorMessage } from "@/ui";
import { HeroesCard } from "./heroes-card";
import { ProfileCard } from "./profile-card";
import { RecentReplaysCard } from "./recent-replays-card";

import styles from "./styles.module.css";

const TOP_HEROES = 20;

export function Home() {
    const replays = useReplays();
    const firstPage = replays.data?.pages[0];
    const profile = useProfileSummary();
    const heroes = useMostPlayedHeroes(TOP_HEROES);
    const error = replays.error ?? profile.error ?? heroes.error;

    return (
        <Page fill>
            {error && <ErrorMessage error={error} />}
            {firstPage && profile.data && heroes.data && (
                <div className={styles.grid}>
                    <RecentReplaysCard
                        replays={firstPage.replays}
                        total={firstPage.total}
                        loadedAt={new Date(replays.dataUpdatedAt)}
                    />
                    <div className={styles.side}>
                        <ProfileCard profile={profile.data} />
                        <HeroesCard heroes={heroes.data} />
                    </div>
                </div>
            )}
        </Page>
    );
}
