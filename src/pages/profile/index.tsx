import { useState } from "react";

import type { ScoreScope } from "@/api/stats";
import { Page } from "@/components";
import { ProfileBests } from "./bests";
import { ProfileHeader } from "./header";
import { PartySize } from "./party-size";
import { RecentForm } from "./recent-form";
import { ScoreCard } from "./score-card";
import { ScoreHeroes } from "./score-heroes";
import { ScoreHistory } from "./score-history";

import styles from "./styles.module.css";

export function Profile() {
    const [scope, setScope] = useState<ScoreScope>("all");

    return (
        <Page>
            <ProfileHeader />
            <ProfileBests />
            <PartySize />
            <ScoreCard scope={scope} onScopeChange={setScope} />
            <ScoreHistory scope={scope} />
            <div className={styles.grid}>
                <div className={styles.half}>
                    <RecentForm scope={scope} />
                </div>
            </div>
            <ScoreHeroes scope={scope} />
        </Page>
    );
}
