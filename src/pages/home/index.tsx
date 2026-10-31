import { Page } from "@/components";
import { HeroesCard } from "./heroes-card";
import { ProfileCard } from "./profile-card";
import { RecentReplaysCard } from "./recent-replays-card";

import styles from "./styles.module.css";

export function Home() {
    return (
        <Page fill>
            <div className={styles.grid}>
                <RecentReplaysCard />
                <div className={styles.side}>
                    <ProfileCard />
                    <HeroesCard />
                </div>
            </div>
        </Page>
    );
}
