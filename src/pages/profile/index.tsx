import { useState } from "react";

import type { ScoreScope } from "@/api/stats";
import { Page } from "@/components";
import { ProfileBests } from "./bests";
import { ProfileHeader } from "./header";
import { PartySize } from "./party-size";
import { Players } from "./players";
import { RecentForm } from "./recent-form";
import { Roles } from "./roles";
import { ScoreCard } from "./score-card";
import { ScoreHeroes } from "./score-heroes";
import { ScoreHistory } from "./score-history";

import styles from "./styles.module.css";

export function Profile() {
    const [scope, setScope] = useState<ScoreScope>("all");

    return (
        <Page>
            <ProfileHeader scope={scope} onScopeChange={setScope} />
            <ProfileBests scope={scope} />
            <ScoreCard scope={scope} />
            <div className={styles.grid}>
                <div className={styles.narrow}>
                    <Players scope={scope} />
                </div>
                <div className={styles.wide}>
                    <PartySize scope={scope} />
                </div>
            </div>
            <ScoreHistory scope={scope} />
            <div className={styles.grid}>
                <div className={styles.wide}>
                    <RecentForm scope={scope} />
                </div>
                <div className={styles.narrow}>
                    <Roles scope={scope} />
                </div>
            </div>
            <ScoreHeroes scope={scope} />
        </Page>
    );
}
