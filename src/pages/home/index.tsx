import { Page } from "@/components";
import { RecentReplaysCard } from "./recent-replays-card";
import { SessionCard } from "./session-card";

import styles from "./styles.module.css";

export function Home() {
    return (
        <Page fill>
            <div className={styles.grid}>
                <RecentReplaysCard />
                <div className={styles.side}>
                    <SessionCard />
                </div>
            </div>
        </Page>
    );
}
