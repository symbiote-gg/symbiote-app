import { useState } from "react";

import type { ScoreScope } from "@/api/stats";
import { Page } from "@/components";
import { ProfileHeader } from "./header";
import { ScoreCard } from "./score-card";
import { ScoreHeroes } from "./score-heroes";
import { ScoreHistory } from "./score-history";

export function Profile() {
    const [scope, setScope] = useState<ScoreScope>("all");

    return (
        <Page>
            <ProfileHeader />
            <ScoreCard scope={scope} onScopeChange={setScope} />
            <ScoreHistory scope={scope} />
            <ScoreHeroes scope={scope} />
        </Page>
    );
}
